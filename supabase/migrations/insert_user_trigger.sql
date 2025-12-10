-- Create function to insert new users into `users` table
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql;

-- Create trigger to call the function after new user is added
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();
