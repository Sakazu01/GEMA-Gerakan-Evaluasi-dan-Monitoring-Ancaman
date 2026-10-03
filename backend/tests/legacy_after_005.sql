do $$ begin
  if (select count(*) from reports where id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2') and status='held' and verification_status='under_review' and observed_at is null and expires_at is null and not observation_time_known)<>2 then
    raise exception 'legacy_migration_invented_observation_or_truth';
  end if;
  raise notice 'Legacy migration acceptance tests passed';
end $$;
delete from reports where id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2');
