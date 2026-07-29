# Bangumi OAuth Edge Functions — 部署步骤

## 步骤 1：运行 SQL 建表

打开 Supabase SQL Editor：
https://supabase.com/dashboard/project/ixszjmrfchqxpxyixiai/sql/new

粘贴并运行以下 SQL：

```sql
create table if not exists public.oauth_states (
  state_hash  text        primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
alter table public.oauth_states enable row level security;

create table if not exists public.bangumi_connections (
  user_id                uuid        primary key references auth.users(id) on delete cascade,
  bangumi_user_id        integer,
  bangumi_username       text,
  access_token_enc       text        not null,
  refresh_token_enc      text        not null,
  expires_at             timestamptz not null,
  connected_at           timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
alter table public.bangumi_connections enable row level security;
```

---

## 步骤 2：设置 Edge Function Secrets

打开：
https://supabase.com/dashboard/project/ixszjmrfchqxpxyixiai/settings/functions

点击 **Manage secrets**，逐一添加以下 5 个 secret：

```
BANGUMI_CLIENT_ID
bgm67796a69f79677b19
```

```
BANGUMI_CLIENT_SECRET
0e18441d13a08cdc76cb9d10643f14c5
```

```
BANGUMI_REDIRECT_URI
https://ixszjmrfchqxpxyixiai.supabase.co/functions/v1/bangumi-oauth-callback
```

```
BANGUMI_USER_AGENT
yzhanglp-anime-tracker/1.0 (https://yzhanglp.com)
```

```
TOKEN_ENCRYPTION_KEY
de218e85ddd1bc1d3c5115e7a23254911710b62f215103bc38880045ae60718b
```

---

## 步骤 3：安装 Supabase CLI（如未安装）

```bash
brew install supabase/tap/supabase
```

或者用官方安装脚本：

```bash
curl -fsSL https://supabase.com/install.sh | sh
```

---

## 步骤 4：登录并部署 Edge Functions

```bash
cd /data2/home/yz12525/yzhanglp.github.io
```

```bash
supabase login
```

```bash
supabase functions deploy bangumi-oauth-start --project-ref ixszjmrfchqxpxyixiai
```

```bash
supabase functions deploy bangumi-oauth-callback --project-ref ixszjmrfchqxpxyixiai
```

```bash
supabase functions deploy bangumi-status --project-ref ixszjmrfchqxpxyixiai
```

```bash
supabase functions deploy bangumi-sync --project-ref ixszjmrfchqxpxyixiai
```

---

## 验证

部署完成后，访问 https://yzhanglp.com/anime/admin/，登录后工具栏应出现 **🔗 Connect Bangumi** 按钮。

点击按钮 → 跳转 bgm.tv 授权页 → 同意后跳回 admin 页面，工具栏变为 **🟢 你的Bangumi用户名**。

之后每张动画卡片底部会出现 **↑ Status**、**↑ Rating**、**↑ Progress** 三个同步按钮。
