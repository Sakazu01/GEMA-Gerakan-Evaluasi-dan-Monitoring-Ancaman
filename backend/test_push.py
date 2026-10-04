import unittest
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch

from app.core.config import settings
from app.services import push
from test_community import NOW,row,REPORT


class Query:
    def __init__(self,database,name):self.database,self.name=database,name
    def __getattr__(self,name):return lambda *args,**kwargs:self
    def update(self,payload):self.database.writes.append((self.name,payload));return self
    def execute(self):return SimpleNamespace(data=self.database.data.get(self.name,[]))


class Database:
    def __init__(self):
        self.writes=[]
        self.data={"push_subscriptions":[{"id":"33333333-3333-4333-8333-333333333333","endpoint":"https://fcm.googleapis.com/test","keys":{},"lat":-6.9,"lng":107.6,"location_mode":"area","location_updated_at":NOW.isoformat(),"accuracy_m":None}]}
    def table(self,name):return Query(self,name)


class PushTests(unittest.TestCase):
    def deliver(self,error=None,status=201,version=2,sub_changes=None,previous=None,report_changes=None):
        database=Database()
        if sub_changes:database.data["push_subscriptions"][0].update(sub_changes)
        if previous:database.data["push_deliveries"]=previous
        with patch.object(push,"get_client",return_value=database),patch.object(push,"utcnow",return_value=NOW),patch.object(push.reports,"get_row",return_value=row(version=2,**(report_changes or {}))),patch.object(push.reports,"rpc",return_value=True),patch.object(settings,"vapid_private_key","test"),patch.object(push,"webpush",side_effect=error,return_value=SimpleNamespace(status_code=status)) as send:
            push.deliver_push({"id":"test-job","report_id":REPORT,"attempts":1,"payload":{"version":version}})
        return database,send

    def test_known_provider_failure_uses_backoff(self):
        database,send=self.deliver(status=500)
        self.assertEqual(send.call_count,1)
        self.assertEqual(database.writes[-1][1]["state"],"retry")
        self.assertNotIn("lat",send.call_args.args[1])

    def test_ambiguous_timeout_does_not_blindly_retry(self):
        database,_=self.deliver(error=TimeoutError())
        self.assertEqual(database.writes[-1][1]["state"],"unknown")

    def test_superseded_job_does_not_send_stale_notice(self):
        database,send=self.deliver(version=1)
        send.assert_not_called()
        self.assertEqual(database.writes[-1][1]["last_error_code"],"superseded")

    def test_device_location_must_be_fresh(self):
        database,send=self.deliver(sub_changes={"location_mode":"device","location_updated_at":(NOW-timedelta(minutes=6)).isoformat(),"accuracy_m":25})
        send.assert_not_called()
        self.assertEqual(database.writes[-1][1]["state"],"sent")

    def test_release_back_to_unconfirmed_bypasses_old_notice_cooldown(self):
        database,send=self.deliver(previous=[{"state":"sent","report_version":1,"sent_at":(NOW-timedelta(minutes=1)).isoformat()}])
        self.assertEqual(send.call_count,1)
        self.assertIn("Belum dikonfirmasi",send.call_args.args[1])
        self.assertEqual(database.writes[-1][1]["state"],"sent")

    def test_correction_reaches_previous_recipient_even_after_leaving_area(self):
        database,send=self.deliver(sub_changes={"lat":0,"lng":0,"location_mode":"device","location_updated_at":(NOW-timedelta(hours=1)).isoformat()},
            previous=[{"state":"sent","report_version":1,"sent_at":NOW.isoformat()}],report_changes={"status":"closed","closure_reason":"refuted"})
        self.assertEqual(send.call_count,1)
        self.assertIn("Pembaruan laporan",send.call_args.args[1])
        self.assertEqual(database.writes[-1][1]["state"],"sent")


if __name__=="__main__":unittest.main()
