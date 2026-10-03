"""Cross-connection tests on a disposable local DB, without any Supabase credentials.

Usage: python tests/postgres_concurrency.py --psql PATH --database gema_final_test
"""
import argparse
import json
import subprocess
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--psql",required=True)
    parser.add_argument("--database",default="gema_final_test")
    parser.add_argument("--port",default="55432")
    args=parser.parse_args()
    if not args.database.startswith("gema_"):
        parser.error("Only a disposable gema_* database is permitted")
    base=[args.psql,"-h","127.0.0.1","-p",args.port,"-U","gema_test","-d",args.database,"-v","ON_ERROR_STOP=1","-qAt","-c"]
    def sql(statement,allow_error=False):
        result=subprocess.run(base+[statement],capture_output=True,text=True,timeout=30)
        if result.returncode and not allow_error:raise AssertionError(result.stderr)
        return result
    def parallel(statement,count):
        barrier=Barrier(count)
        def run(index):barrier.wait();return sql(statement(index),True)
        with ThreadPoolExecutor(max_workers=count) as pool:return list(pool.map(run,range(count)))
    author,observer,moderator,report=[str(uuid4()) for _ in range(4)]
    scope=f"concurrent_{uuid4()}"
    endpoint=f"https://fcm.googleapis.com/test/{uuid4()}"
    payload="jsonb_build_object('reported_type','fire','lat',-6.9,'lng',107.6,'location_source','device','location_label','Concurrency fixture','observation_time_known',true,'observed_at','2026-10-03T12:00:00Z','photo_source','camera')"
    # Clock is derived once from PostgreSQL, so all retry payloads are identical.
    observed=sql("select now()::text").stdout.strip()
    payload=payload.replace("2026-10-03T12:00:00Z",observed)
    try:
        sql(f"insert into reports(id,author_id,ai_status,ai_disaster_type,type,severity,ai_summary) values('{report}','{author}','relevant','fire','fire','tinggi','Concurrency fixture'); insert into user_roles(user_id,role) values('{moderator}','moderator'),('{moderator}','responder');")
        results=parallel(lambda _:f"select submit_report('{author}','{report}',{payload},'concurrent','hash',12,true)",8)
        assert all(result.returncode==0 for result in results),[result.stderr for result in results]
        submitted=[json.loads(result.stdout) for result in results]
        assert sum(not item['already_published'] for item in submitted)==1
        assert sql(f"select count(*) from notification_outbox where report_id='{report}' and channel='telegram'").stdout.strip()=="1"
        print("PASS: concurrent submit creates one report/outbox; identical retries return its result")

        version=sql(f"select version from reports where id='{report}'").stdout.strip()
        results=parallel(lambda _:f"select moderate_report('{moderator}','{report}','confirm','Moderator checks direct evidence.','Fixture',{version},null,null,12)",2)
        assert sum(result.returncode==0 for result in results)==1
        assert any("version_conflict" in result.stderr for result in results)
        assert sql(f"select count(*) from moderation_events where report_id='{report}' and action='confirm'").stdout.strip()=="1"
        print("PASS: concurrent moderators produce one decision and one version conflict")

        sql(f"update reports set telegram_chat_id='test',telegram_message_id=123 where id='{report}'")
        results=parallel(lambda _:f"select accept_responder_report('{report}','test',123,'{moderator}','Test responder')",2)
        assert all(result.returncode==0 for result in results)
        assert sum(json.loads(result.stdout)['changed'] for result in results)==1
        print("PASS: two responder callbacks accept only once")

        results=parallel(lambda _:f"select take_quota('{scope}','{author}','local-test',3,100,86400)",8)
        assert all(result.returncode==0 for result in results)
        assert sum(json.loads(result.stdout)['allowed'] for result in results)==3
        print("PASS: shared quota admits exactly three requests across eight connections")

        def subscription(index):
            user=author if index==0 else observer
            return f"select save_push_subscription('{user}',jsonb_build_object('endpoint','{endpoint}','keys','{{}}'::jsonb,'lat',-6.9,'lng',107.6,'location_mode','area','location_updated_at',now()))"
        results=parallel(subscription,2)
        assert sum(result.returncode==0 for result in results)==1
        assert any("subscription_conflict" in result.stderr for result in results)
        print("PASS: concurrent subscription registration cannot overwrite another owner")
    finally:
        sql(f"delete from reports where id='{report}'; delete from user_roles where user_id='{moderator}'; delete from idempotency_keys where user_id='{author}'; delete from rate_limit_buckets where scope='{scope}'; delete from push_subscriptions where endpoint='{endpoint}';")


if __name__=="__main__":main()
