# Marketing setup — WordPress only (no Vercel needed)

Dashboard: **https://kafundawines.com/marketing** — log in with your WordPress account
(shop managers and administrators only).

## 1. Install (Code Snippets)

1. Snippets → open "Kafunda Marketing" (or Add New, type PHP).
2. Delete everything in the editor and paste the whole of `wordpress/kafunda-marketing-snippet.php`.
   It has no PHP opening tag on purpose — Code Snippets adds it.
3. Location: **Run everywhere** → Save Snippet (Active).

Alternative: Plugins → Add New → Upload `wordpress/kafunda-marketing.zip`. Use one or the other;
if both are active the second copy does nothing.

## 2. Settings tab (kafundawines.com/marketing → Settings)

- **From email**: an address on kafundawines.com, e.g. `offers@kafundawines.com`.
- **Send test email**. If it doesn't arrive, install **WP Mail SMTP** and connect your email provider.
- **OneSignal REST API key**: OneSignal → Settings → Keys & IDs → Add key → paste. The App ID is pre-filled.
- **Push sign-up on kafundawines.com**: tick only if OneSignal → Settings → Push → Web is set to
  Site URL `https://kafundawines.com` (OneSignal allows one website per app).
- If another abandoned-cart plugin is active ("Cart reminders"), switch one of them off.

## 3. OneSignal abandoned-cart push (optional)

Journeys → New Journey: entry = tag `cart_update` exists → wait 1 hour → if tag still exists,
send "Your cart is waiting 🛒" linking to `https://kafundawines.com/cart/`.
The site sets the tag on add-to-cart and removes it on the order-received page.

## What runs automatically

- Checkout on kafundawines.com saves the cart once a phone/email is typed.
- Reminder emails after 1 h and 24 h with a "Complete my order" link that refills the cart.
- Any processing/completed order with the same phone/email marks the cart recovered/converted.
- Past customers who gave an email join the offers list; every email has one-click unsubscribe.
- Email campaigns send 25 per minute (faster while the Email tab is open).
- Wrong emails are skipped: typos (gmial.com, gmail.con…), fake/placeholder addresses, domains that
  don't exist, and addresses the mail server refused. List + manual block in the Email tab.
- Every automatic push sells one product: a random pick from each drink's best sellers, with its
  photo and real price, a different drink each time. During Black November (1–30 Nov) and the
  Christmas Sale (1–25 Dec) the push carries the sale's name. Only products with a real sale price
  in WooCommerce mention a saving.
- Ugandan holidays and special days keep their greeting and add a fitting bottle. Quiet days
  (Good Friday, Martyrs' Day, Eid) get one greeting, no products and no email.
- App pushes open the app (no web link on phones); website pushes open the link.

## shop.kafundawines.com (only if it gets redeployed)

The shop code now talks to the public WordPress endpoints (`/wp-json/kafunda/v1/mkt/public/*`),
so it needs **no new environment variables**. `/marketing` on the shop redirects to WordPress.
