# API and Postman assets

- [`API-documentation.md`](./API-documentation.md) documents the verified
  Supabase Auth, PostgREST, and RPC operations used by the application. ShopEasy
  does not provide a custom Express API.
- [`postman/ShopEasy.postman_collection.json`](./postman/ShopEasy.postman_collection.json)
  contains representative requests for the documented Supabase endpoints.
- [`postman/ShopEasy.postman_environment.json`](./postman/ShopEasy.postman_environment.json)
  is a placeholder environment. Supply a development project URL, public
  anon/publishable key, and test-user values locally; do not commit credentials.

The application source, SQL migrations, and Supabase policies remain the
authoritative description of available operations and access controls.
