<?php
/**
 * Plugin Name: Kafunda Marketing
 * Description: Push (OneSignal) incl. automatic daily pushes + matching emails, offer emails (wp_mail), customer export and abandoned-cart recovery. Dashboard at /marketing.
 * Version: 2.5.0
 * Author: Kafunda Wines & Spirits
 */
if (!defined('ABSPATH')) exit;

/**
 * KAFUNDA MARKETING — Code Snippets version (v2, WordPress only)
 * ==============================================================
 * Paste this whole file into Code Snippets (type: PHP, "Run everywhere").
 * There is deliberately no opening PHP tag — Code Snippets adds it.
 *
 * Dashboard:  https://kafundawines.com/marketing   (log in with your WordPress account;
 *             shop managers and administrators only)
 *
 *  - Push       send OneSignal notifications to the app + website subscribers
 *  - Email      offer emails sent with wp_mail (your SMTP / email plugin), in batches
 *  - Carts      abandoned checkouts: automatic reminder emails after 1h and 24h,
 *               one-tap WhatsApp follow-up, "Complete my order" link restores the cart
 *  - Settings   sender, OneSignal keys, push sign-up on this site
 *
 * Abandoned carts are captured on the kafundawines.com checkout, and (optionally)
 * from shop.kafundawines.com through the public endpoints under /wp-json/kafunda/v1/mkt/public/*.
 *
 * Every email has a one-click unsubscribe; unsubscribed people are never emailed again.
 * Safe if loaded twice (snippet + plugin): the second copy does nothing.
 */

if (!defined('KAFUNDA_MKT_LOADED')) {
define('KAFUNDA_MKT_LOADED', true);

define('KAFUNDA_MKT_DB_VERSION', '2');
define('KAFUNDA_MKT_BATCH', 25);             // emails per tick
define('KAFUNDA_MKT_REMINDER_1_MIN', 60);    // first cart reminder after 1 hour
define('KAFUNDA_MKT_REMINDER_2_MIN', 1440);  // second after 24 hours
define('KAFUNDA_MKT_CART_MAX_AGE_DAYS', 7);
define('KAFUNDA_MKT_SLUG', 'marketing');      // kafundawines.com/marketing

/* ------------------------------------------------------------------------ */
/* Settings                                                                  */
/* ------------------------------------------------------------------------ */

function kafunda_mkt_opts() {
    $defaults = [
        'shop_url'           => 'https://shop.kafundawines.com',
        'from_name'          => 'Kafunda Wines & Spirits',
        'from_email'         => '',
        'whatsapp'           => '256785498279',
        'reminders_on'       => 1,
        'capture_checkout'   => 1,
        'onesignal_app_id'   => 'b32cacdc-557b-4892-80a5-99262c592d34',
        'onesignal_rest_key' => '',
        'push_on_site'       => 0,
    ];
    $opts = get_option('kafunda_mkt_settings', []);
    if (!is_array($opts)) $opts = [];
    return array_merge($defaults, $opts);
}

function kafunda_mkt_shop_url($path = '') {
    return rtrim(kafunda_mkt_opts()['shop_url'], '/') . $path;
}

function kafunda_mkt_dash_url($tab = 'overview', $args = []) {
    return add_query_arg(array_merge(['tab' => $tab], $args), home_url('/' . KAFUNDA_MKT_SLUG . '/'));
}

/** Secret used only to sign unsubscribe links. Generated once, never shown. */
function kafunda_mkt_secret() {
    $s = get_option('kafunda_mkt_secret');
    if (!$s) {
        $s = wp_generate_password(48, false, false);
        update_option('kafunda_mkt_secret', $s, false);
    }
    return $s;
}

/* ------------------------------------------------------------------------ */
/* Database                                                                  */
/* ------------------------------------------------------------------------ */

function kafunda_mkt_tables() {
    global $wpdb;
    return [
        'carts'     => $wpdb->prefix . 'kafunda_carts',
        'subs'      => $wpdb->prefix . 'kafunda_subscribers',
        'campaigns' => $wpdb->prefix . 'kafunda_campaigns',
    ];
}

function kafunda_mkt_install() {
    global $wpdb;
    $t = kafunda_mkt_tables();
    $charset = $wpdb->get_charset_collate();
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    dbDelta("CREATE TABLE {$t['carts']} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        token varchar(80) NOT NULL,
        source varchar(10) NOT NULL DEFAULT 'wp',
        email varchar(190) NOT NULL DEFAULT '',
        phone varchar(32) NOT NULL DEFAULT '',
        name varchar(190) NOT NULL DEFAULT '',
        items longtext NULL,
        subtotal bigint(20) NOT NULL DEFAULT 0,
        status varchar(20) NOT NULL DEFAULT 'open',
        reminders tinyint(3) unsigned NOT NULL DEFAULT 0,
        last_reminder_at datetime NULL,
        order_id bigint(20) unsigned NOT NULL DEFAULT 0,
        created_at datetime NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY token (token),
        KEY status_updated (status, updated_at),
        KEY email (email),
        KEY phone (phone)
    ) $charset;");

    dbDelta("CREATE TABLE {$t['subs']} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        email varchar(190) NOT NULL,
        name varchar(190) NOT NULL DEFAULT '',
        phone varchar(32) NOT NULL DEFAULT '',
        source varchar(40) NOT NULL DEFAULT '',
        status varchar(20) NOT NULL DEFAULT 'subscribed',
        created_at datetime NOT NULL,
        unsubscribed_at datetime NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY email (email),
        KEY status (status)
    ) $charset;");

    dbDelta("CREATE TABLE {$t['campaigns']} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        subject varchar(255) NOT NULL,
        payload longtext NOT NULL,
        audience varchar(20) NOT NULL DEFAULT 'all',
        status varchar(20) NOT NULL DEFAULT 'queued',
        recipients longtext NOT NULL,
        total int(10) unsigned NOT NULL DEFAULT 0,
        sent int(10) unsigned NOT NULL DEFAULT 0,
        failed int(10) unsigned NOT NULL DEFAULT 0,
        cursor_pos int(10) unsigned NOT NULL DEFAULT 0,
        created_at datetime NOT NULL,
        finished_at datetime NULL,
        PRIMARY KEY  (id),
        KEY status (status)
    ) $charset;");

    update_option('kafunda_mkt_db_version', KAFUNDA_MKT_DB_VERSION, false);
}

add_action('init', function () {
    if (get_option('kafunda_mkt_db_version') !== KAFUNDA_MKT_DB_VERSION) kafunda_mkt_install();
});

/* ------------------------------------------------------------------------ */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------ */

function kafunda_mkt_now() { return current_time('mysql', true); } // UTC

/** Last 9 digits of a Ugandan number: "0712 345 678" / "+256712345678" -> "712345678". */
function kafunda_mkt_phone_key($phone) {
    $digits = preg_replace('/\D+/', '', (string) $phone);
    return strlen($digits) >= 9 ? substr($digits, -9) : '';
}

function kafunda_mkt_clean_email($email) {
    $email = strtolower(trim((string) $email));
    return is_email($email) ? $email : '';
}

function kafunda_mkt_clean_token($token) {
    $token = preg_replace('/[^A-Za-z0-9\-]/', '', (string) $token);
    return (strlen($token) >= 16 && strlen($token) <= 80) ? $token : '';
}

function kafunda_mkt_ugx($n) { return 'UGX ' . number_format((float) $n); }

function kafunda_mkt_client_ip() {
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? ($_SERVER['REMOTE_ADDR'] ?? '');
    return preg_replace('/[^0-9a-fA-F:.]/', '', (string) $ip);
}

/** Simple per-IP limiter for public endpoints. */
function kafunda_mkt_rate_ok($bucket, $max, $window_s) {
    $key = 'kmk_rl_' . $bucket . '_' . md5(kafunda_mkt_client_ip());
    $n = (int) get_transient($key);
    if ($n >= $max) return false;
    set_transient($key, $n + 1, $window_s);
    return true;
}

function kafunda_mkt_unsub_token($email) {
    return substr(hash_hmac('sha256', strtolower($email), kafunda_mkt_secret()), 0, 24);
}

function kafunda_mkt_unsub_url($email) {
    return add_query_arg([
        'kafunda_unsubscribe' => 1,
        'e' => rawurlencode($email),
        't' => kafunda_mkt_unsub_token($email),
    ], home_url('/'));
}

/** "Complete my order" link — works for kafundawines.com and shop carts alike. */
function kafunda_mkt_restore_url($token, $utm_source, $utm_campaign) {
    return add_query_arg([
        'kafunda_restore' => $token,
        'utm_source' => $utm_source,
        'utm_medium' => 'abandoned_cart',
        'utm_campaign' => $utm_campaign,
    ], home_url('/'));
}

function kafunda_mkt_is_unsubscribed($email) {
    global $wpdb;
    $t = kafunda_mkt_tables();
    return (bool) $wpdb->get_var($wpdb->prepare(
        "SELECT 1 FROM {$t['subs']} WHERE email = %s AND status = 'unsubscribed'", $email
    ));
}

/* ---- Wrong addresses: typos, fake/placeholder emails, dead domains, failed sends ---- */

/** Common misspellings of the big providers. */
function kafunda_mkt_typo_domains() {
    return ['gmial.com', 'gamil.com', 'gmai.com', 'gmal.com', 'gmali.com', 'gmaill.com', 'gnail.com', 'gmil.com', 'gemail.com', 'gmaii.com',
        'gmail.co', 'gmail.cm', 'gmail.om', 'gmail.co.ug', 'gmail.ug', 'gmail.comm', 'gmailcom.com', 'gmail.cim',
        'yaho.com', 'yahooo.com', 'yhoo.com', 'yahoo.co', 'yahoo.cm', 'yahoo.om',
        'hotmial.com', 'hotmal.com', 'hotmai.com', 'hotmil.com', 'hotmail.co', 'hotmail.cm',
        'outlok.com', 'outllook.com', 'outlook.co', 'iclod.com', 'icoud.com', 'icloud.co'];
}

/** Throwaway inboxes and made-up domains people type to get past a form. */
function kafunda_mkt_fake_domains() {
    return ['example.com', 'example.org', 'example.net', 'test.com', 'domain.com', 'fake.com', 'none.com', 'no.com', 'noemail.com',
        'no-email.com', 'nomail.com', 'abc.com', 'xyz.com', 'asd.com', 'mailinator.com', 'yopmail.com', 'guerrillamail.com',
        'sharklasers.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'trashmail.com', 'throwawaymail.com',
        'maildrop.cc', 'getnada.com', 'dispostable.com'];
}

/** Addresses that failed to send or were blocked by hand: [email => [why, fails, blocked, t]]. */
function kafunda_mkt_bad_emails($save = null) {
    static $list = null;
    if ($save !== null) { $list = $save; update_option('kafunda_mkt_bad_emails', $save, false); return $save; }
    if ($list === null) { $list = get_option('kafunda_mkt_bad_emails', []); if (!is_array($list)) $list = []; }
    return $list;
}

function kafunda_mkt_flag_email($email, $why, $block_now = false) {
    $email = strtolower(trim((string) $email));
    if (!is_email($email)) return;
    $bad = kafunda_mkt_bad_emails();
    $x = $bad[$email] ?? ['fails' => 0];
    $x['fails'] = (int) $x['fails'] + 1;
    $x['why'] = $why;
    $x['t'] = time();
    // A hard "no such address", or two failed sends, and we stop trying.
    $x['blocked'] = ($block_now || $x['fails'] >= 2) ? 1 : 0;
    $bad[$email] = $x;
    kafunda_mkt_bad_emails($bad);
}

/** Can mail be delivered to this domain (MX or A record)? Cached; at most 30 new lookups per page load. */
function kafunda_mkt_domain_ok($domain) {
    static $cache = null, $lookups = 0, $dns_works = null;
    if (!function_exists('checkdnsrr')) return true;
    if ($cache === null) { $cache = get_option('kafunda_mkt_domains', []); if (!is_array($cache)) $cache = []; }
    $known = $cache[$domain] ?? null;
    // Good domains are trusted for 30 days, dead ones re-checked after 3.
    if ($known && $known['t'] > time() - ($known['ok'] ? 30 : 3) * DAY_IN_SECONDS) return (bool) $known['ok'];
    if ($lookups >= 30) return $known ? (bool) $known['ok'] : true;
    if ($dns_works === null) $dns_works = checkdnsrr('gmail.com.', 'MX'); // server can't do DNS → don't blame the address
    if (!$dns_works) return true;
    $lookups++;
    $ok = checkdnsrr($domain . '.', 'MX') || checkdnsrr($domain . '.', 'A');
    $cache[$domain] = ['ok' => $ok ? 1 : 0, 't' => time()];
    update_option('kafunda_mkt_domains', $cache, false);
    return $ok;
}

/** Why we shouldn't email this address, or '' if it looks fine. */
function kafunda_mkt_email_problem($email) {
    $email = strtolower(trim((string) $email));
    if (!is_email($email)) return 'not a valid email address';
    [$local, $domain] = explode('@', $email, 2);
    $bad = kafunda_mkt_bad_emails()[$email] ?? null;
    if ($bad && !empty($bad['blocked'])) return $bad['why'];
    if (in_array($domain, kafunda_mkt_typo_domains(), true) || preg_match('/\.(con|cmo|cpm|vom|xom|comm|coom|cim|clm)$/', $domain)) return "typo in the domain ($domain)";
    if (in_array($domain, kafunda_mkt_fake_domains(), true)) return 'fake / throwaway address';
    if (preg_match('/^(no-?e?-?mails?|none|nil|null|na|n-a|nope|test\d*|testing|fake|x+|abc|asdf\w*|qwerty\w*|sample|dummy|guest|0+)$/', $local)) return 'placeholder address';
    $own = preg_replace('/^www\./', '', (string) parse_url(home_url('/'), PHP_URL_HOST));
    if ($domain === $own && preg_match('/^\+?\d+$/', $local)) return 'placeholder address';
    if (!kafunda_mkt_domain_ok($domain)) return "domain $domain does not exist";
    return '';
}

/** The mail server refused a recipient → remember it. Server-wide problems (SMTP down, login) are ignored. */
add_action('wp_mail_failed', function ($err) {
    if (!is_wp_error($err)) return;
    $msg = $err->get_error_message();
    if (preg_match('/connect|authenticat|timed? ?out|could not instantiate|password|login|quota|too many|tls|ssl/i', $msg)) return;
    $hard = (bool) preg_match('/invalid address|does not exist|no such user|user unknown|mailbox unavailable|recipient.*(rejected|refused)|\b55[0-3]\b/i', $msg);
    $data = $err->get_error_data();
    foreach ((array) ($data['to'] ?? []) as $to) kafunda_mkt_flag_email($to, $hard ? 'rejected by the mail server' : 'failed to send twice', $hard);
});

/** A successful send clears earlier soft failures. */
add_action('wp_mail_succeeded', function ($data) {
    $bad = kafunda_mkt_bad_emails();
    $changed = false;
    foreach ((array) ($data['to'] ?? []) as $to) {
        $to = strtolower(trim((string) $to));
        if (isset($bad[$to]) && empty($bad[$to]['blocked'])) { unset($bad[$to]); $changed = true; }
    }
    if ($changed) kafunda_mkt_bad_emails($bad);
});

/* ------------------------------------------------------------------------ */
/* Email                                                                     */
/* ------------------------------------------------------------------------ */

/** Branded HTML email. $p: heading, body (blank line = paragraph), image_url, cta_text, cta_url, items, preheader. */
function kafunda_mkt_render_email($p, $email) {
    $e = function ($s) { return esc_html((string) $s); };
    $green = '#228f22';
    $logo = kafunda_mkt_shop_url('/kafunda-logo-full.png');

    $paras = '';
    foreach (preg_split("/\R{2,}/", trim((string) ($p['body'] ?? ''))) as $para) {
        if ($para === '') continue;
        $paras .= '<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#333">' . nl2br($e($para)) . '</p>';
    }

    $items = '';
    if (!empty($p['items']) && is_array($p['items'])) {
        $items .= '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;border-top:1px solid #eee">';
        foreach (array_slice($p['items'], 0, 8) as $it) {
            $img = !empty($it['image']) ? '<img src="' . esc_url($it['image']) . '" width="56" height="56" alt="" style="display:block;border-radius:8px;object-fit:cover;background:#f4f4f4">' : '';
            $items .= '<tr><td style="padding:10px 0;border-bottom:1px solid #eee;width:64px">' . $img . '</td>'
                . '<td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:14px;color:#141414"><strong>' . $e($it['name'] ?? '') . '</strong><br><span style="color:#777">Qty ' . intval($it['quantity'] ?? 1) . '</span></td>'
                . '<td style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;color:#141414;text-align:right;white-space:nowrap">' . $e(kafunda_mkt_ugx(($it['price'] ?? 0) * ($it['quantity'] ?? 1))) . '</td></tr>';
        }
        $items .= '</table>';
    }

    $image = !empty($p['image_url'])
        ? '<img src="' . esc_url($p['image_url']) . '" alt="" width="560" style="display:block;width:100%;max-width:560px;height:auto;border-radius:12px;margin:0 0 18px">'
        : '';

    $cta = '';
    if (!empty($p['cta_text']) && !empty($p['cta_url'])) {
        $cta = '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 6px"><tr><td style="background:' . $green . ';border-radius:999px">'
            . '<a href="' . esc_url($p['cta_url']) . '" style="display:inline-block;padding:14px 30px;font-size:14px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#fff;text-decoration:none">' . $e($p['cta_text']) . '</a>'
            . '</td></tr></table>';
    }

    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'
        . '<body style="margin:0;padding:0;background:#faf7f0;font-family:Arial,Helvetica,sans-serif">'
        . '<span style="display:none;max-height:0;overflow:hidden;opacity:0">' . $e($p['preheader'] ?? '') . '</span>'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f0;padding:24px 12px"><tr><td align="center">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden">'
        . '<tr><td style="padding:22px 20px;text-align:center;border-bottom:4px solid ' . $green . '"><a href="' . esc_url(home_url('/')) . '"><img src="' . esc_url($logo) . '" alt="Kafunda Wines &amp; Spirits" height="44" style="height:44px;width:auto"></a></td></tr>'
        . '<tr><td style="padding:28px 24px 8px">'
        . '<h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#141414">' . $e($p['heading'] ?? '') . '</h1>'
        . $image . $paras . $items . $cta . kafunda_mkt_render_products($p['products'] ?? [], $p['products_heading'] ?? 'More picks for you')
        . '</td></tr>'
        . '<tr><td style="padding:22px 24px 26px;font-size:12px;line-height:1.6;color:#888;text-align:center">'
        . '1–2 hour delivery across Kampala · Pay with Mobile Money, card or cash on delivery<br>'
        . 'Kafunda Wines &amp; Spirits, Kampala · <a href="https://wa.me/' . esc_attr(kafunda_mkt_opts()['whatsapp']) . '" style="color:#888">WhatsApp us</a><br>'
        . 'For adults 18+ only. Please drink responsibly.<br>'
        . '<a href="' . esc_url(kafunda_mkt_unsub_url($email)) . '" style="color:#888">Unsubscribe</a>'
        . '</td></tr></table></td></tr></table></body></html>';
}

/** "More picks" grid for offer emails: [ [name, price, was, image, url], … ] → 2 cards per row. */
function kafunda_mkt_render_products($products, $heading = 'More picks for you') {
    if (empty($products) || !is_array($products)) return '';
    $e = function ($s) { return esc_html((string) $s); };
    $cells = [];
    foreach (array_slice($products, 0, 4) as $pr) {
        $cells[] = '<td width="50%" valign="top" style="padding:6px">'
            . '<a href="' . esc_url($pr['url'] ?? '') . '" style="text-decoration:none;color:#141414;display:block;border:1px solid #eee;border-radius:12px;padding:12px;text-align:center">'
            . (!empty($pr['image']) ? '<img src="' . esc_url($pr['image']) . '" alt="" width="140" style="display:block;margin:0 auto 8px;width:140px;max-width:100%;height:140px;object-fit:contain">' : '')
            . '<div style="font-size:13px;font-weight:700;line-height:1.3;min-height:34px">' . $e($pr['name'] ?? '') . '</div>'
            . '<div style="font-size:14px;font-weight:800;color:#228f22;margin-top:4px">' . $e($pr['price'] ?? '') . '</div>'
            . (!empty($pr['was']) ? '<div style="font-size:11px;color:#999;text-decoration:line-through">' . $e($pr['was']) . '</div>' : '')
            . '<div style="margin-top:8px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#228f22">Order now →</div>'
            . '</a></td>';
    }
    $rows = '';
    foreach (array_chunk($cells, 2) as $pair) {
        if (count($pair) === 1) $pair[] = '<td width="50%"></td>';
        $rows .= '<tr>' . implode('', $pair) . '</tr>';
    }
    return '<h2 style="margin:22px 0 6px;font-size:15px;color:#141414">' . $e($heading) . '</h2>'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 -6px">' . $rows . '</table>';
}

function kafunda_mkt_send($email, $subject, $payload) {
    if (!$email || kafunda_mkt_is_unsubscribed($email) || kafunda_mkt_email_problem($email)) return false;
    $opts = kafunda_mkt_opts();
    $headers = ['Content-Type: text/html; charset=UTF-8'];
    if (!empty($opts['from_email']) && is_email($opts['from_email'])) {
        $headers[] = 'From: ' . $opts['from_name'] . ' <' . $opts['from_email'] . '>';
    }
    $headers[] = 'List-Unsubscribe: <' . kafunda_mkt_unsub_url($email) . '>';
    return wp_mail($email, $subject, kafunda_mkt_render_email($payload, $email), $headers);
}

/* ------------------------------------------------------------------------ */
/* Audiences                                                                 */
/* ------------------------------------------------------------------------ */

function kafunda_mkt_customer_emails() {
    global $wpdb;
    $hpos = class_exists('\Automattic\WooCommerce\Utilities\OrderUtil')
        && \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled();
    if ($hpos) {
        $rows = $wpdb->get_col("SELECT DISTINCT LOWER(billing_email) FROM {$wpdb->prefix}wc_orders WHERE type = 'shop_order' AND billing_email <> ''");
    } else {
        $rows = $wpdb->get_col("SELECT DISTINCT LOWER(pm.meta_value) FROM {$wpdb->postmeta} pm
            JOIN {$wpdb->posts} p ON p.ID = pm.post_id
            WHERE p.post_type = 'shop_order' AND pm.meta_key = '_billing_email' AND pm.meta_value <> ''");
    }
    $emails = (array) $rows;
    foreach (get_users(['role' => 'customer', 'fields' => ['user_email'], 'number' => 20000]) as $u) {
        $emails[] = strtolower($u->user_email);
    }
    return $emails;
}

/** Emails to send to. Wrong addresses are left out and returned in $skipped [email => why]. */
function kafunda_mkt_audience($audience, &$skipped = null) {
    global $wpdb;
    $t = kafunda_mkt_tables();
    $list = [];
    if ($audience === 'subscribers' || $audience === 'all') {
        $list = array_merge($list, (array) $wpdb->get_col("SELECT email FROM {$t['subs']} WHERE status = 'subscribed'"));
    }
    if ($audience === 'customers' || $audience === 'all') $list = array_merge($list, kafunda_mkt_customer_emails());

    $list = array_unique(array_filter(array_map(function ($e) { return strtolower(trim((string) $e)); }, $list)));
    $unsub = array_flip((array) $wpdb->get_col("SELECT email FROM {$t['subs']} WHERE status = 'unsubscribed'"));
    $out = []; $skipped = [];
    foreach ($list as $e) {
        if (isset($unsub[$e])) continue;
        $why = kafunda_mkt_email_problem($e);
        if ($why) $skipped[$e] = $why; else $out[] = $e;
    }
    return $out;
}

function kafunda_mkt_add_subscriber($email, $name = '', $phone = '', $source = '', $explicit = true) {
    global $wpdb;
    $t = kafunda_mkt_tables();
    $email = kafunda_mkt_clean_email($email);
    if (!$email) return false;
    $row = $wpdb->get_row($wpdb->prepare("SELECT id, status FROM {$t['subs']} WHERE email = %s", $email));
    if ($row) {
        $data = [];
        if ($name)  $data['name'] = sanitize_text_field($name);
        if ($phone) $data['phone'] = sanitize_text_field($phone);
        if ($explicit && $row->status !== 'subscribed') { $data['status'] = 'subscribed'; $data['unsubscribed_at'] = null; }
        if ($data) $wpdb->update($t['subs'], $data, ['id' => $row->id]);
        return true;
    }
    return (bool) $wpdb->insert($t['subs'], [
        'email' => $email,
        'name' => sanitize_text_field($name),
        'phone' => sanitize_text_field($phone),
        'source' => sanitize_key($source),
        'status' => 'subscribed',
        'created_at' => kafunda_mkt_now(),
    ]);
}

/* ------------------------------------------------------------------------ */
/* Carts                                                                     */
/* ------------------------------------------------------------------------ */

/** Insert or update a cart by token. $data: email, phone, name, items[], subtotal. */
function kafunda_mkt_upsert_cart($token, $data, $source) {
    global $wpdb;
    $t = kafunda_mkt_tables();
    $row = [
        'email'      => kafunda_mkt_clean_email($data['email'] ?? ''),
        'phone'      => kafunda_mkt_phone_key($data['phone'] ?? ''),
        'name'       => sanitize_text_field((string) ($data['name'] ?? '')),
        'items'      => wp_json_encode(array_slice((array) ($data['items'] ?? []), 0, 50)),
        'subtotal'   => (int) round((float) ($data['subtotal'] ?? 0)),
        'updated_at' => kafunda_mkt_now(),
    ];
    if (!$row['email'] && !$row['phone']) return false;

    $existing = $wpdb->get_row($wpdb->prepare("SELECT id, status, email, phone, name FROM {$t['carts']} WHERE token = %s", $token));
    if ($existing && $existing->status !== 'open') {
        // Already bought / dismissed and shopping again: archive the old record, start fresh.
        $wpdb->update($t['carts'], ['token' => substr($token, 0, 60) . '-' . $existing->id], ['id' => $existing->id]);
        $existing = null;
    }
    if ($existing) {
        // Don't wipe contact details typed earlier with a blank field.
        foreach (['email', 'phone', 'name'] as $k) if ($row[$k] === '') $row[$k] = $existing->$k;
        $wpdb->update($t['carts'], $row, ['id' => $existing->id]);
    } else {
        $wpdb->insert($t['carts'], $row + ['token' => $token, 'source' => $source, 'status' => 'open', 'created_at' => kafunda_mkt_now()]);
    }
    return true;
}

function kafunda_mkt_convert_cart($token, $order_id) {
    global $wpdb;
    $t = kafunda_mkt_tables();
    $row = $wpdb->get_row($wpdb->prepare("SELECT id, reminders FROM {$t['carts']} WHERE token = %s AND status = 'open'", $token));
    if (!$row) return;
    $wpdb->update($t['carts'], [
        // "recovered" = bought after a reminder; "converted" = bought on their own.
        'status' => $row->reminders > 0 ? 'recovered' : 'converted',
        'order_id' => (int) $order_id,
        'updated_at' => kafunda_mkt_now(),
    ], ['id' => $row->id]);
}

/** A real order with the same phone/email closes any open cart (works for app, shop and website orders). */
function kafunda_mkt_mark_order($order_id) {
    $order = function_exists('wc_get_order') ? wc_get_order($order_id) : null;
    if (!$order || !in_array($order->get_status(), ['processing', 'completed', 'on-hold'], true)) return;

    global $wpdb;
    $t = kafunda_mkt_tables();
    $email = kafunda_mkt_clean_email($order->get_billing_email());
    $phone = kafunda_mkt_phone_key($order->get_billing_phone());
    if (!$email && !$phone) return;

    $where = []; $args = [];
    if ($email) { $where[] = 'email = %s'; $args[] = $email; }
    if ($phone) { $where[] = 'phone = %s'; $args[] = $phone; }
    $args[] = gmdate('Y-m-d H:i:s', time() - KAFUNDA_MKT_CART_MAX_AGE_DAYS * DAY_IN_SECONDS);

    $carts = $wpdb->get_results($wpdb->prepare(
        "SELECT id, reminders FROM {$t['carts']} WHERE status = 'open' AND (" . implode(' OR ', $where) . ") AND created_at > %s",
        $args
    ));
    foreach ($carts as $c) {
        $wpdb->update($t['carts'], [
            'status' => $c->reminders > 0 ? 'recovered' : 'converted',
            'order_id' => $order_id,
            'updated_at' => kafunda_mkt_now(),
        ], ['id' => $c->id]);
    }
    // Customers who gave an email join the offers list (never re-adds someone who unsubscribed).
    if ($email) kafunda_mkt_add_subscriber($email, $order->get_billing_first_name(), $order->get_billing_phone(), 'order', false);
}
add_action('woocommerce_new_order', 'kafunda_mkt_mark_order', 20);
add_action('woocommerce_order_status_processing', 'kafunda_mkt_mark_order', 20);
add_action('woocommerce_order_status_completed', 'kafunda_mkt_mark_order', 20);
add_action('woocommerce_order_status_on-hold', 'kafunda_mkt_mark_order', 20);

/* ---- Capture on the kafundawines.com checkout --------------------------- */

function kafunda_mkt_wc_ready() {
    if (!function_exists('WC')) return false;
    if (function_exists('wc_load_cart') && (!WC()->cart || !WC()->session)) wc_load_cart();
    return WC()->cart && WC()->session;
}

function kafunda_mkt_session_token($create = false) {
    $token = WC()->session ? (string) WC()->session->get('kafunda_cart_token') : '';
    if (!$token && $create) {
        $token = wp_generate_password(32, false, false);
        if (!WC()->session->has_session()) WC()->session->set_customer_session_cookie(true);
        WC()->session->set('kafunda_cart_token', $token);
    }
    return $token;
}

function kafunda_mkt_ajax_capture() {
    if (empty(kafunda_mkt_opts()['capture_checkout'])) wp_send_json(['ok' => false]);
    if (!kafunda_mkt_rate_ok('cap', 60, HOUR_IN_SECONDS)) wp_send_json(['ok' => false]);
    if (!kafunda_mkt_wc_ready() || WC()->cart->is_empty()) wp_send_json(['ok' => false]);

    $items = []; $subtotal = 0;
    foreach (WC()->cart->get_cart() as $ci) {
        $product = $ci['data'] ?? null;
        if (!$product) continue;
        $price = (float) wc_get_price_to_display($product);
        $qty = (int) $ci['quantity'];
        $items[] = [
            'id' => (int) $ci['product_id'],
            'variation_id' => (int) ($ci['variation_id'] ?? 0),
            'name' => $product->get_name(),
            'price' => $price,
            'quantity' => $qty,
            'image' => (string) wp_get_attachment_image_url($product->get_image_id(), 'thumbnail'),
        ];
        $subtotal += $price * $qty;
    }
    $ok = kafunda_mkt_upsert_cart(kafunda_mkt_session_token(true), [
        'email' => wp_unslash($_POST['email'] ?? ''),
        'phone' => wp_unslash($_POST['phone'] ?? ''),
        'name' => wp_unslash($_POST['name'] ?? ''),
        'items' => $items,
        'subtotal' => $subtotal,
    ], 'wp');
    wp_send_json(['ok' => $ok]);
}
add_action('wp_ajax_kafunda_mkt_capture', 'kafunda_mkt_ajax_capture');
add_action('wp_ajax_nopriv_kafunda_mkt_capture', 'kafunda_mkt_ajax_capture');

/** Watches the checkout contact fields (classic and block checkout) and saves the cart. */
add_action('wp_footer', function () {
    if (empty(kafunda_mkt_opts()['capture_checkout']) || !function_exists('is_checkout') || !is_checkout() || is_order_received_page()) return;
    $ajax = esc_url(admin_url('admin-ajax.php'));
    echo "<script>(function(){var T,F='#billing_email,#email,#billing_phone,#billing-phone,#shipping-phone,#billing_first_name,#billing-first_name,#billing_last_name,#billing-last_name';"
        . "function v(s){var el=document.querySelector(s);return el&&el.value?el.value.trim():'';}"
        . "function send(){var d=new FormData();d.append('action','kafunda_mkt_capture');"
        . "d.append('email',v('#billing_email')||v('#email'));d.append('phone',v('#billing_phone')||v('#billing-phone')||v('#shipping-phone'));"
        . "d.append('name',((v('#billing_first_name')||v('#billing-first_name'))+' '+(v('#billing_last_name')||v('#billing-last_name'))).trim());"
        . "if(!d.get('email')&&!d.get('phone'))return;fetch('{$ajax}',{method:'POST',body:d,credentials:'same-origin',keepalive:true}).catch(function(){});}"
        . "document.addEventListener('input',function(e){if(e.target&&e.target.matches&&e.target.matches(F)){clearTimeout(T);T=setTimeout(send,1500);}},true);"
        . "document.addEventListener('change',function(e){if(e.target&&e.target.matches&&e.target.matches(F)){clearTimeout(T);T=setTimeout(send,300);}},true);"
        . "})();</script>";
}, 50);

/** Order placed on this site: close the cart that belongs to this session. */
function kafunda_mkt_checkout_done($order_id) {
    if (is_object($order_id) && method_exists($order_id, 'get_id')) $order_id = $order_id->get_id();
    if (!function_exists('WC') || !WC()->session) return;
    $token = (string) WC()->session->get('kafunda_cart_token');
    if ($token) {
        kafunda_mkt_convert_cart($token, $order_id);
        WC()->session->set('kafunda_cart_token', null);
    }
}
add_action('woocommerce_checkout_order_processed', 'kafunda_mkt_checkout_done', 20);
add_action('woocommerce_store_api_checkout_order_processed', 'kafunda_mkt_checkout_done', 20);

/** /?kafunda_restore=TOKEN — "Complete my order" link from emails and WhatsApp. */
add_action('wp_loaded', function () {
    if (empty($_GET['kafunda_restore'])) return;
    global $wpdb;
    $t = kafunda_mkt_tables();
    $token = kafunda_mkt_clean_token($_GET['kafunda_restore']);
    $row = $token ? $wpdb->get_row($wpdb->prepare("SELECT source, items FROM {$t['carts']} WHERE token = %s", $token)) : null;

    $utm = [];
    foreach (['utm_source', 'utm_medium', 'utm_campaign'] as $k) {
        if (!empty($_GET[$k])) $utm[$k] = sanitize_key($_GET[$k]);
    }
    nocache_headers();

    if (!$row) { wp_safe_redirect(add_query_arg($utm, home_url('/'))); exit; }

    if ($row->source === 'shop') {
        wp_redirect(add_query_arg(array_merge(['restore' => $token], $utm), kafunda_mkt_shop_url('/cart')));
        exit;
    }

    if (kafunda_mkt_wc_ready()) {
        WC()->cart->empty_cart();
        foreach ((array) json_decode($row->items, true) as $it) {
            $pid = (int) ($it['id'] ?? 0);
            if ($pid) WC()->cart->add_to_cart($pid, max(1, (int) ($it['quantity'] ?? 1)), (int) ($it['variation_id'] ?? 0));
        }
        if (!WC()->session->has_session()) WC()->session->set_customer_session_cookie(true);
        WC()->session->set('kafunda_cart_token', $token); // same record → counts as "recovered"
        wp_safe_redirect(add_query_arg($utm, wc_get_checkout_url()));
        exit;
    }
    wp_safe_redirect(home_url('/'));
    exit;
}, 20);

/* ------------------------------------------------------------------------ */
/* Cron: campaign batches + cart reminders                                    */
/* ------------------------------------------------------------------------ */

add_filter('cron_schedules', function ($s) {
    $s['kafunda_minute'] = ['interval' => 60, 'display' => 'Every minute (Kafunda marketing)'];
    return $s;
});
add_action('init', function () {
    if (!wp_next_scheduled('kafunda_mkt_tick')) wp_schedule_event(time() + 60, 'kafunda_minute', 'kafunda_mkt_tick');
});
add_action('kafunda_mkt_tick', 'kafunda_mkt_tick');

function kafunda_mkt_tick() {
    if (get_transient('kafunda_mkt_tick_lock')) return ['locked' => true];
    set_transient('kafunda_mkt_tick_lock', 1, 55);
    $out = ['campaign_sent' => 0, 'reminders_sent' => 0];
    try {
        $out['campaign_sent'] = kafunda_mkt_process_campaigns();
        $out['reminders_sent'] = kafunda_mkt_process_reminders();
        kafunda_mkt_auto_plan();
        kafunda_mkt_auto_emails();
    } finally {
        delete_transient('kafunda_mkt_tick_lock');
    }
    return $out;
}

function kafunda_mkt_process_campaigns() {
    global $wpdb;
    $t = kafunda_mkt_tables();
    $c = $wpdb->get_row("SELECT * FROM {$t['campaigns']} WHERE status IN ('queued','sending') ORDER BY id ASC LIMIT 1");
    if (!$c) return 0;

    $recipients = json_decode($c->recipients, true) ?: [];
    $payload = json_decode($c->payload, true) ?: [];
    $slice = array_slice($recipients, (int) $c->cursor_pos, KAFUNDA_MKT_BATCH);
    $sent = 0; $failed = 0;
    foreach ($slice as $email) {
        if (kafunda_mkt_send($email, $c->subject, $payload)) $sent++; else $failed++;
    }
    $cursor = (int) $c->cursor_pos + count($slice);
    $done = $cursor >= count($recipients);
    $wpdb->update($t['campaigns'], [
        'cursor_pos'  => $cursor,
        'sent'        => (int) $c->sent + $sent,
        'failed'      => (int) $c->failed + $failed,
        'status'      => $done ? 'done' : 'sending',
        'finished_at' => $done ? kafunda_mkt_now() : null,
    ], ['id' => $c->id]);
    return $sent;
}

function kafunda_mkt_process_reminders() {
    if (empty(kafunda_mkt_opts()['reminders_on'])) return 0;
    global $wpdb;
    $t = kafunda_mkt_tables();
    $now = time();

    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$t['carts']}
         WHERE status = 'open' AND email <> '' AND reminders < 2 AND updated_at < %s AND created_at > %s
         ORDER BY updated_at ASC LIMIT 10",
        gmdate('Y-m-d H:i:s', $now - KAFUNDA_MKT_REMINDER_1_MIN * 60),
        gmdate('Y-m-d H:i:s', $now - KAFUNDA_MKT_CART_MAX_AGE_DAYS * DAY_IN_SECONDS)
    ));

    $sent = 0;
    foreach ($rows as $cart) {
        if ($cart->reminders > 0) {
            $since = $now - strtotime($cart->last_reminder_at . ' UTC');
            if ($since < (KAFUNDA_MKT_REMINDER_2_MIN - KAFUNDA_MKT_REMINDER_1_MIN) * 60) continue;
        }
        $first = trim(explode(' ', (string) $cart->name)[0] ?? '');
        $hi = $first ? "Hi $first," : 'Hi there,';
        $n = $cart->reminders + 1;

        if ($n === 1) {
            $subject = 'You left something in your cart 🛒';
            $payload = [
                'preheader' => 'Your drinks are still waiting — delivered in 1–2 hours.',
                'heading'   => 'Your cart is saved',
                'body'      => "$hi\n\nYou were almost done! We've kept your cart so you can finish in one tap — we deliver across Kampala in 1–2 hours.",
            ];
        } else {
            $subject = 'Still thinking it over? Your cart is waiting';
            $payload = [
                'preheader' => 'Pay with Mobile Money or cash on delivery.',
                'heading'   => 'Ready when you are',
                'body'      => "$hi\n\nYour items are still in your cart. Pay with Mobile Money, card — or cash when it arrives. Questions? Message us on WhatsApp and we'll sort it out.",
            ];
        }
        $payload['items'] = json_decode($cart->items, true) ?: [];
        $payload['cta_text'] = 'Complete my order';
        $payload['cta_url'] = kafunda_mkt_restore_url($cart->token, 'email', 'reminder_' . $n);

        if (kafunda_mkt_send($cart->email, $subject, $payload)) $sent++;
        // Count the attempt either way so a bad address isn't retried forever.
        $wpdb->update($t['carts'], ['reminders' => $n, 'last_reminder_at' => kafunda_mkt_now()], ['id' => $cart->id]);
    }
    return $sent;
}

/* ------------------------------------------------------------------------ */
/* OneSignal push                                                            */
/* ------------------------------------------------------------------------ */

function kafunda_mkt_onesignal($method, $path, $body = null) {
    $o = kafunda_mkt_opts();
    $key = trim($o['onesignal_rest_key']);
    if (!$o['onesignal_app_id'] || !$key) {
        return new WP_Error('onesignal', 'Add your OneSignal REST API key in the Settings tab first.');
    }
    $args = [
        'method' => $method,
        'timeout' => 20,
        'headers' => [
            // New keys (os_v2_…) use "Key", legacy keys use "Basic".
            'Authorization' => (strpos($key, 'os_v2_') === 0 ? 'Key ' : 'Basic ') . $key,
            'Content-Type' => 'application/json',
        ],
    ];
    if ($body !== null) $args['body'] = wp_json_encode($body);
    $res = wp_remote_request('https://api.onesignal.com/' . $path, $args);
    if (is_wp_error($res)) return $res;
    $code = (int) wp_remote_retrieve_response_code($res);
    $data = json_decode(wp_remote_retrieve_body($res), true);
    if ($code >= 300) {
        $err = is_array($data) && isset($data['errors']) ? (is_array($data['errors']) ? implode(' ', array_map('wp_json_encode', $data['errors'])) : (string) $data['errors']) : "HTTP $code";
        return new WP_Error('onesignal', 'OneSignal: ' . trim($err, '"'));
    }
    return is_array($data) ? $data : [];
}

function kafunda_mkt_send_push($f) {
    $o = kafunda_mkt_opts();
    $body = [
        'app_id' => $o['onesignal_app_id'],
        'target_channel' => 'push',
        'included_segments' => ['Total Subscriptions'],
        'headings' => ['en' => $f['title']],
        'contents' => ['en' => $f['message']],
    ];
    if ($f['audience'] === 'web') $body['isAnyWeb'] = true;
    if ($f['audience'] === 'app') { $body['isIos'] = true; $body['isAndroid'] = true; }
    // Website pushes open the link. On phones the push opens the app itself (no app_url —
    // a web link there would open the browser); the link travels in data for the app to use.
    if ($f['url']) { $body['web_url'] = $f['url']; $body['data'] = ['url' => $f['url']]; }
    if ($f['image']) {
        $body['big_picture'] = $f['image'];
        $body['chrome_web_image'] = $f['image'];
        $body['ios_attachments'] = ['image' => $f['image']];
        $body['mutable_content'] = true;
    }
    if ($f['send_after']) $body['send_after'] = $f['send_after'];

    $r = kafunda_mkt_onesignal('POST', 'notifications?c=push', $body);
    if (is_wp_error($r)) return $r;
    if (empty($r['id'])) return new WP_Error('onesignal', 'No subscribers matched that audience yet.');
    return $r;
}

/* ---- Automatic daily pushes + emails ------------------------------------ */
/*
 * Every day at the chosen times (default 09:00, 12:00, 16:00, 20:00 Kampala) a push
 * goes to app + web subscribers, and (once a day by default) a matching email.
 * Every push sells one product: a random pick from each drink's best sellers (real
 * price cuts first), with its photo and real price, a different drink each time.
 * During a store-wide sale (Black November, Christmas Sale) the push carries its name.
 *  - Ugandan holidays and special days keep their greeting and add a fitting product.
 *  - Quiet days (Good Friday, Martyrs' Day, Eid) get one greeting and nothing to buy.
 * Today's and tomorrow's pushes are handed to OneSignal in advance with
 * send_after, so they go out on time even if nobody visits the site at 9am.
 */

function kafunda_mkt_auto_opts() {
    // email: 'off' | 'first' (one email a day, with the first push) | 'all' (an email with every push)
    $d = ['on' => 0, 'slots' => ['09:00', '12:00', '16:00', '20:00'], 'audience' => 'all', 'link' => 'shop', 'email' => 'first'];
    $o = get_option('kafunda_mkt_auto', []);
    return array_merge($d, is_array($o) ? $o : []);
}

function kafunda_mkt_auto_log($save = null) {
    if ($save !== null) {
        ksort($save);
        update_option('kafunda_mkt_auto_log', array_slice($save, -80, null, true), false);
        return $save;
    }
    $log = get_option('kafunda_mkt_auto_log', []);
    return is_array($log) ? $log : [];
}

function kafunda_mkt_tz() { return new DateTimeZone('Africa/Kampala'); }

/** Drinks we rotate through: key => [label, emoji, category-name regex, serving tip]. */
function kafunda_mkt_themes() {
    return [
        'wine'      => ['Wine', '🍷', '/wine|vino/i', 'Tip: a good red with luwombo or nyama choma is hard to beat.'],
        'whisky'    => ['Whisky', '🥃', '/whisk/i', 'Tip: one big ice cube melts slower than five small ones — your whisky stays strong.'],
        'beer'      => ['Beer & cider', '🍺', '/beer|lager|cider|stout/i', 'Tip: a crate in the fridge before the match is the best kind of planning.'],
        'gin'       => ['Gin', '🍸', '/\bgins?\b/i', 'Tip: gin, tonic, lots of ice and a slice of lemon — Kampala heat sorted.'],
        'champagne' => ['Bubbly', '🍾', '/champagne|sparkling|prosecco|bubbl|cava/i', 'Tip: you don\'t need an occasion. Opening the bottle IS the occasion.'],
        'vodka'     => ['Vodka', '🧊', '/vodka/i', 'Tip: keep the bottle in the freezer — it won\'t freeze, but it will impress.'],
        'cognac'    => ['Cognac & brandy', '🥃', '/cognac|brandy/i', 'Tip: a cognac after dinner turns a normal evening into a "remember that night".'],
        'rum'       => ['Rum', '🏝️', '/\brums?\b/i', 'Tip: rum, cola and fresh lime. Simple, and it never fails.'],
        'tequila'   => ['Tequila', '🌵', '/tequila|mezcal/i', 'Tip: salt, lime, tequila — and someone to take the photo.'],
        'liqueur'   => ['Liqueurs', '🍫', '/liqueur|cream/i', 'Tip: a cream liqueur over ice is dessert you don\'t have to cook.'],
    ];
}

/** Product categories whose name matches a theme. */
function kafunda_mkt_theme_cats($theme) {
    static $terms = null;
    if ($terms === null) $terms = get_terms(['taxonomy' => 'product_cat', 'hide_empty' => true]);
    $themes = kafunda_mkt_themes();
    if (is_wp_error($terms) || !isset($themes[$theme])) return [];
    $re = $themes[$theme][2];
    return array_values(array_filter((array) $terms, function ($t) use ($re) { return preg_match($re, $t->name . ' ' . $t->slug); }));
}

/** Regular price if the product's price is really cut, else 0. */
function kafunda_mkt_was_price($p) {
    $now = (float) $p->get_price();
    $reg = $p->is_type('variable') ? (float) $p->get_variation_regular_price('max') : (float) $p->get_regular_price();
    return ($now > 0 && $reg > $now) ? $reg : 0;
}

/**
 * The drink for each push of the day. Windows of 4 = one day at the default 4 slots:
 * four different drinks; 5-day cycle. Fast movers (whisky, wine, beer) come round most often.
 */
function kafunda_mkt_offer_rotation() {
    return ['whisky', 'wine', 'beer', 'gin',
            'vodka', 'whisky', 'wine', 'champagne',
            'beer', 'whisky', 'cognac', 'wine',
            'gin', 'beer', 'rum', 'whisky',
            'wine', 'liqueur', 'vodka', 'tequila'];
}

/**
 * The store-wide sale running on a date, or null. Keep in step with src/lib/campaign.ts.
 * Pushes carry the sale's name; only products with a real sale price claim a saving.
 */
function kafunda_mkt_campaign(DateTime $at) {
    $sales = [
        ['name' => 'Black November', 'emoji' => '🖤', 'from' => '11-01', 'to' => '11-30', 'ends' => '30 Nov'],
        ['name' => 'Christmas Sale', 'emoji' => '🎄', 'from' => '12-01', 'to' => '12-25', 'ends' => '25 Dec'],
    ];
    $md = $at->format('m-d');
    foreach ($sales as $s) if ($md >= $s['from'] && $md <= $s['to']) return $s;
    return null;
}

/** Drinks to try for slot $i, best first. Special days stick to the drinks that fit the occasion. */
function kafunda_mkt_slot_themes(array $plan, $i) {
    $list = kafunda_mkt_offer_rotation();
    $start = ($plan['n'] * 4 + $i) % count($list);
    if (($plan['kind'] ?? '') === 'special') {
        $list = kafunda_mkt_specials()[$plan['special'][0]]['themes'] ?? [];
        if (!$list) return [];
        $start = $i % count($list);
    }
    return array_values(array_unique(array_merge(array_slice($list, $start), array_slice($list, 0, $start))));
}

/** A theme's likely quick sales: in-stock, with a photo — every price cut plus its all-time best sellers. */
function kafunda_mkt_fast_sellers($theme) {
    static $cache = [];
    if (isset($cache[$theme])) return $cache[$theme];
    $cats = kafunda_mkt_theme_cats($theme);
    if (!$cats) return $cache[$theme] = [];
    $base = ['status' => 'publish', 'stock_status' => 'instock', 'category' => wp_list_pluck($cats, 'slug')];
    $popular = wc_get_products($base + ['limit' => 24, 'meta_key' => 'total_sales', 'orderby' => 'meta_value_num', 'order' => 'DESC']);
    $sale = function_exists('wc_get_product_ids_on_sale') ? wc_get_product_ids_on_sale() : [];
    $cuts = $sale ? wc_get_products($base + ['limit' => 60, 'include' => array_slice($sale, 0, 1000)]) : [];
    $found = [];
    foreach (array_merge($cuts, $popular) as $p) {
        // UGX 15k floor: single beers and miniatures aren't worth a push.
        if ((float) $p->get_price() >= 15000 && $p->get_image_id() && $p->is_visible()) $found[$p->get_id()] = $p;
    }
    return $cache[$theme] = array_values($found);
}

/**
 * Random pick for a push: [theme, product]. Takes the first theme with something not
 * featured lately, price cuts ahead of everything else; ['', null] if nothing can be sold.
 */
function kafunda_mkt_pick_offer(array $themes) {
    $recent = get_option('kafunda_mkt_auto_recent', []);
    $recent = array_flip(is_array($recent) ? $recent : []);
    $fallback = ['', null];
    foreach ($themes as $th) {
        $pool = kafunda_mkt_fast_sellers($th);
        if (!$pool) continue;
        if (!$fallback[1]) $fallback = [$th, $pool[array_rand($pool)]];
        $fresh = array_filter($pool, function ($p) use ($recent) { return !isset($recent[$p->get_id()]); });
        if (!$fresh) continue;
        $from = array_values(array_filter($fresh, 'kafunda_mkt_was_price') ?: $fresh);
        return [$th, $from[array_rand($from)]];
    }
    return $fallback;
}

function kafunda_mkt_mark_featured($product_id) {
    $recent = get_option('kafunda_mkt_auto_recent', []);
    if (!is_array($recent)) $recent = [];
    $recent[] = (int) $product_id;
    update_option('kafunda_mkt_auto_recent', array_slice(array_values(array_unique($recent)), -40), false);
}

/** Easter Sunday (Gregorian), without needing the PHP calendar extension. */
function kafunda_mkt_easter($y) {
    $a = $y % 19; $b = intdiv($y, 100); $c = $y % 100; $d = intdiv($b, 4); $e = $b % 4;
    $f = intdiv($b + 8, 25); $g = intdiv($b - $f + 1, 3); $h = (19 * $a + $b - $d - $g + 15) % 30;
    $i = intdiv($c, 4); $k = $c % 4; $l = (32 + 2 * $e + 2 * $i - $h - $k) % 7; $m = intdiv($a + 11 * $h + 22 * $l, 451);
    $month = intdiv($h + $l - 7 * $m + 114, 31); $day = (($h + $l - 7 * $m + 114) % 31) + 1;
    return sprintf('%04d-%02d-%02d', $y, $month, $day);
}

/**
 * Ugandan holidays + days worth promoting.
 * tone: party (promote it), holiday (relaxed day off), quiet (religious/memorial: one respectful
 * greeting, no products, no email). lead: days before it we already start talking about it.
 * {when} in lead lines becomes "tomorrow" / "in 2 days" / "in 3 days".
 */
function kafunda_mkt_specials() {
    return [
        'newyear' => ['name' => "New Year's Day", 'tone' => 'party', 'themes' => ['champagne', 'wine'], 'lines' => [
            ['Happy New Year from Kafunda 🎆', 'Thank you for drinking with us this year. Here\'s to a better one — and yes, we\'re delivering today.'],
            ['New year, same fast delivery 🛵', 'Friends still around? Keep the celebration going — delivered in 1–2 hours.'],
            ['Resolution idea 💡', '"Never run out of drinks when visitors come." Easy to keep — we deliver.'],
        ], 'email' => ['Happy New Year from all of us at Kafunda 🎆', "Thank you for every order this year — from birthday bottles to Friday night beers, we loved bringing them to you.\n\nWe're open today, so if the party isn't over yet, we've got you."]],
        'liberation' => ['name' => 'Liberation Day', 'tone' => 'holiday', 'themes' => ['beer', 'wine'], 'lines' => [
            ['Public holiday — enjoy the day off 🇺🇬', 'No office today. Relax at home, we bring the drinks in 1–2 hours.'],
            ['Holiday plans? Keep it simple 🛋️', 'Stay in, call friends over, we deliver.'],
        ], 'email' => ['Enjoy the public holiday 🇺🇬', "No alarm, no office, no traffic — enjoy the day off.\n\nIf friends drop by, we'll make sure the drinks are cold and on time."]],
        'valentine' => ['name' => "Valentine's Day", 'tone' => 'party', 'lead' => 2, 'themes' => ['wine', 'champagne', 'liqueur'],
            'lead_line' => ["Valentine's Day is {when} ❤️", 'Flowers fade, a good bottle gets remembered. Order early — delivered in 1–2 hours.'],
            'lead_email' => ["Valentine's is {when} — sorted yet? ❤️", "Valentine's Day is {when}. Skip the last-minute panic: a bottle of wine or bubbly says it better than a card.\n\nOrder now, choose a delivery time that suits you, pay on delivery."],
            'lines' => [
                ["Happy Valentine's Day ❤️", 'Dinner at home, candles, a good bottle. We deliver the last part in 1–2 hours.'],
                ['Forgot it\'s Valentine\'s? 😬', 'We won\'t tell. Order now and look like you planned it all week.'],
                ['Tonight is for two 🍷', 'Red, rosé or bubbly — delivered before dinner is ready.'],
            ], 'email' => ["Happy Valentine's Day ❤️", "Tonight is for the people you love. Make dinner at home special with a bottle of wine or bubbly — we'll have it at your door in 1–2 hours.\n\nAnd if you forgot it was today… we won't tell anyone."]],
        'janani' => ['name' => 'Archbishop Janani Luwum Day', 'tone' => 'holiday', 'themes' => [], 'lines' => [
            ['Enjoy the public holiday 🙏', 'A day to remember and to rest. If you\'re staying home, we deliver.'],
        ], 'email' => ['A day to remember and rest', "Today we remember Archbishop Janani Luwum. Enjoy the public holiday with family and friends.\n\nIf you're staying home, we're delivering as usual."]],
        'women' => ['name' => "International Women's Day", 'tone' => 'party', 'themes' => ['champagne', 'wine', 'liqueur'], 'lines' => [
            ["Happy Women's Day 💐", 'To the women who run homes, offices and Kampala — raise a glass, you deserve it.'],
            ['Celebrate her today 🥂', 'Mum, wife, sister, boss — surprise her with a bottle, delivered in 1–2 hours.'],
        ], 'email' => ["Happy International Women's Day 💐", "To every woman who keeps Kampala running — today is yours.\n\nCelebrating someone special? Send her a bottle of wine or bubbly — we deliver in 1–2 hours."]],
        'goodfriday' => ['name' => 'Good Friday', 'tone' => 'quiet', 'lines' => [
            ['Blessed Easter weekend 🙏', 'Wishing you and your family a peaceful Easter from all of us at Kafunda.'],
        ]],
        'easter' => ['name' => 'Easter Sunday', 'tone' => 'party', 'themes' => ['wine', 'champagne'], 'lines' => [
            ['Happy Easter! 🐣', 'Family lunch today? A good bottle on the table makes it complete. Delivered in 1–2 hours.'],
            ['Easter lunch sorted? 🍗🍷', 'You cook, we bring the wine.'],
        ], 'email' => ['Happy Easter from Kafunda 🐣', "Wishing you a joyful Easter with family and friends.\n\nHosting lunch? Let us bring the wine and drinks — delivered in 1–2 hours, pay on delivery."]],
        'eastermonday' => ['name' => 'Easter Monday', 'tone' => 'holiday', 'themes' => ['beer', 'wine'], 'lines' => [
            ['One more day off 😌', 'Easter Monday = a lazy day at home. We deliver.'],
        ], 'email' => ['One more day off 😌', "Easter Monday — no work, no rush. Relax.\n\nIf the fridge emptied out yesterday, we can fix that in 1–2 hours."]],
        'labour' => ['name' => 'Labour Day', 'tone' => 'holiday', 'themes' => ['beer', 'whisky'], 'lines' => [
            ['Happy Labour Day — you\'ve earned it 💪', 'A whole year of hard work. Today, put your feet up. We deliver.'],
            ['Hard worker spotted 👀', 'Reward yourself tonight — delivered in 1–2 hours.'],
        ], 'email' => ['Happy Labour Day — you\'ve earned it 💪', "All year you've worked hard. Today, rest.\n\nYour reward is one tap away — we deliver across Kampala in 1–2 hours."]],
        'mothers' => ['name' => "Mother's Day", 'tone' => 'party', 'lead' => 2, 'themes' => ['wine', 'champagne', 'liqueur'],
            'lead_line' => ["Mother's Day is {when} 💐", 'She did a lot for you. A nice bottle is the least — order early, delivered in 1–2 hours.'],
            'lead_email' => ["Mother's Day is {when} 💐", "Mother's Day is {when}. A bottle of her favourite wine (or something sweet like a cream liqueur) says thank you better than words.\n\nOrder now — we deliver to her door or yours."],
            'lines' => [
                ["Happy Mother's Day 💐", 'Call mum. Then send her something nice — we deliver in 1–2 hours.'],
                ['Still need a gift for mum? 🎁', 'Wine, bubbly or a cream liqueur — at her door this afternoon.'],
            ], 'email' => ["Happy Mother's Day 💐", "Today is for mum. If you can't be there, send a bottle — we deliver anywhere in Kampala in 1–2 hours."]],
        'whiskyday' => ['name' => 'World Whisky Day', 'tone' => 'party', 'themes' => ['whisky'], 'lines' => [
            ['It\'s World Whisky Day 🥃', 'An official excuse. Pick a bottle, we deliver in 1–2 hours.'],
            ['Whisky Day plans? 🥃', 'Neat, on the rocks or with ginger ale — you choose, we deliver.'],
        ], 'email' => ['Happy World Whisky Day 🥃', "Yes, it's a real day. And the best way to celebrate is with a good bottle and good company.\n\nNeat, on the rocks or in a cocktail — we deliver in 1–2 hours."]],
        'martyrs' => ['name' => "Uganda Martyrs' Day", 'tone' => 'quiet', 'lines' => [
            ["Uganda Martyrs' Day 🙏", 'Wishing all pilgrims a safe journey to Namugongo and back home.'],
        ]],
        'heroes' => ['name' => 'Heroes Day', 'tone' => 'holiday', 'themes' => ['beer', 'whisky'], 'lines' => [
            ['Happy Heroes Day 🇺🇬', 'Public holiday — enjoy it with the everyday heroes in your life. We deliver.'],
        ], 'email' => ['Happy Heroes Day 🇺🇬', "Today we honour Uganda's heroes. Enjoy the public holiday with family and friends — the everyday heroes.\n\nWe're delivering as usual."]],
        'fathers' => ['name' => "Father's Day", 'tone' => 'party', 'lead' => 2, 'themes' => ['whisky', 'cognac'],
            'lead_line' => ["Father's Day is {when} 👔", 'Socks again? Get dad a bottle he\'ll actually enjoy. Order early.'],
            'lead_email' => ["Father's Day is {when} — skip the socks 👔", "Father's Day is {when}. This year, give dad something he'll actually open: a good whisky or cognac.\n\nOrder now — delivered in 1–2 hours anywhere in Kampala."],
            'lines' => [
                ["Happy Father's Day 👔", 'Raise a glass to dad today. Whisky or cognac delivered in 1–2 hours.'],
                ['Dad deserves better than a tie 🥃', 'A good bottle, delivered to his door this afternoon.'],
            ], 'email' => ["Happy Father's Day 👔", "Today is for dad. Show him some love with a bottle he'll enjoy — we deliver across Kampala in 1–2 hours."]],
        'ginday' => ['name' => 'World Gin Day', 'tone' => 'party', 'themes' => ['gin'], 'lines' => [
            ['Happy World Gin Day 🍸', 'Gin, tonic, ice, lemon. We bring the first two.'],
        ], 'email' => ['Happy World Gin Day 🍸', "Today the whole world drinks gin — join in.\n\nGrab a bottle and some tonic, we deliver in 1–2 hours."]],
        'beerday' => ['name' => 'International Beer Day', 'tone' => 'party', 'themes' => ['beer'], 'lines' => [
            ['It\'s International Beer Day 🍺', 'And it\'s a Friday. Coincidence? Order a crate, we deliver.'],
        ], 'email' => ['Cheers to International Beer Day 🍺', "It's International Beer Day — and it falls on a Friday. We think that's a sign.\n\nCold beer, delivered in 1–2 hours."]],
        'independence' => ['name' => 'Independence Day', 'tone' => 'party', 'lead' => 1, 'themes' => ['beer', 'whisky', 'champagne'],
            'lead_line' => ['Independence Day is {when} 🇺🇬', 'Public holiday + friends = drinks. Stock up today, beat the rush.'],
            'lead_email' => ['Independence Day is {when} 🇺🇬', "Tomorrow Uganda celebrates — and it's a public holiday. Stock up today so you're not stuck in the queue tomorrow.\n\nDelivered in 1–2 hours, pay on delivery."],
            'lines' => [
                ['Happy Independence Day, Uganda! 🇺🇬', 'Celebrate the Pearl of Africa — drinks delivered in 1–2 hours.'],
                ['For God and my country — and my friends 🇺🇬', 'Celebrating today? We deliver across Kampala.'],
                ['Black, yellow, red… and cold drinks 🇺🇬', 'Keep the celebration going, order now.'],
            ], 'email' => ['Happy Independence Day, Uganda! 🇺🇬', "Happy Independence Day! Today we celebrate the Pearl of Africa.\n\nWhether it's a family lunch or a party with friends, we'll bring the drinks — delivered in 1–2 hours."]],
        'champagneday' => ['name' => 'Champagne Day', 'tone' => 'party', 'themes' => ['champagne'], 'lines' => [
            ['It\'s Champagne Day 🍾', 'Pop something tonight — you don\'t need another reason.'],
        ], 'email' => ['Pop! It\'s Champagne Day 🍾', "Today is Champagne Day. Celebrate the small wins: it's Friday, you made it through the week.\n\nBubbly delivered in 1–2 hours."]],
        'xmaseve' => ['name' => 'Christmas Eve', 'tone' => 'party', 'themes' => ['wine', 'champagne', 'whisky'], 'lines' => [
            ['Christmas Eve! Last chance to stock up 🎄', 'Shops are packed — we deliver in 1–2 hours. Skip the queue.'],
            ['Visitors arriving tonight? 🎄', 'Don\'t be the house with no drinks. Order now.'],
        ], 'email' => ['Christmas Eve — skip the queues 🎄', "The supermarkets are packed and the traffic is worse. Stay home — we'll bring everything for tomorrow in 1–2 hours.\n\nWine for lunch, bubbly for the toast, whisky for the uncles."]],
        'christmas' => ['name' => 'Christmas', 'tone' => 'party', 'lead' => 3, 'themes' => ['wine', 'champagne', 'whisky'],
            'lead_line' => ['Christmas is {when} 🎄', 'Beat the rush — order your Christmas drinks today, delivered in 1–2 hours.'],
            'lead_email' => ['Christmas is {when} — get your drinks sorted 🎄', "Christmas is {when}. Order the drinks now and avoid the last-minute queues.\n\nWine for lunch, bubbly for the toast, whisky for the uncles — all delivered in 1–2 hours."],
            'lines' => [
                ['Merry Christmas from Kafunda 🎄', 'Thank you for a wonderful year. Yes — we\'re delivering today.'],
                ['Ran out already? 🎅', 'Visitors finished the drinks? We deliver on Christmas too.'],
            ], 'email' => ['Merry Christmas from all of us at Kafunda 🎄', "Merry Christmas! Thank you for shopping with us this year.\n\nIf the visitors are many and the drinks are few, we're delivering today."]],
        'boxing' => ['name' => 'Boxing Day', 'tone' => 'holiday', 'themes' => ['beer', 'wine'], 'lines' => [
            ['Boxing Day: still celebrating? 🎁', 'The leftovers need drinks. We deliver.'],
        ], 'email' => ['Boxing Day — the party continues 🎁', "Christmas isn't over until the leftovers are finished.\n\nWe're delivering today, as always."]],
        'nye' => ['name' => "New Year's Eve", 'tone' => 'party', 'themes' => ['champagne', 'whisky', 'wine'], 'lines' => [
            ['New Year\'s Eve! Got the bubbly? 🍾', 'Midnight is coming — order before the rush, delivered in 1–2 hours.'],
            ['Countdown checklist ✅', 'Friends ✅ Music ✅ Bubbly for midnight? We\'ve got you.'],
            ['Last orders of the year 🎆', 'Order now so the drinks arrive before the fireworks.'],
        ], 'email' => ["New Year's Eve — bubbly for midnight? 🍾", "Tonight we say goodbye to the year. Make sure there's something to pop at midnight.\n\nOrder early — tonight is our busiest night."]],
        'eid' => ['name' => 'Eid', 'tone' => 'quiet', 'lines' => [
            ['Eid Mubarak 🌙', 'Wishing all our Muslim customers and their families a blessed Eid.'],
        ]],
    ];
}

/** date (Y-m-d) => special key for a year. Eid follows the moon: approximate dates. */
function kafunda_mkt_special_dates($year) {
    $out = [];
    $fixed = ['01-01' => 'newyear', '01-26' => 'liberation', '02-14' => 'valentine', '02-16' => 'janani', '03-08' => 'women',
        '05-01' => 'labour', '06-03' => 'martyrs', '06-09' => 'heroes', '10-09' => 'independence',
        '12-24' => 'xmaseve', '12-25' => 'christmas', '12-26' => 'boxing', '12-31' => 'nye'];
    foreach ($fixed as $md => $k) $out["$year-$md"] = $k;
    $rel = ['second sunday of may' => 'mothers', 'third saturday of may' => 'whiskyday', 'third sunday of june' => 'fathers',
        'second saturday of june' => 'ginday', 'first friday of august' => 'beerday', 'fourth friday of october' => 'champagneday'];
    foreach ($rel as $when => $k) $out[(new DateTime("$when $year"))->format('Y-m-d')] = $k;
    $easter = new DateTime(kafunda_mkt_easter($year));
    $out[(clone $easter)->modify('-2 days')->format('Y-m-d')] = 'goodfriday';
    $out[$easter->format('Y-m-d')] = 'easter';
    $out[(clone $easter)->modify('+1 day')->format('Y-m-d')] = 'eastermonday';
    $eid = ['2026' => ['03-20', '05-27'], '2027' => ['03-10', '05-17'], '2028' => ['02-27', '05-05'], '2029' => ['02-14', '04-24'], '2030' => ['02-05', '04-13']];
    foreach ($eid[(string) $year] ?? [] as $md) $out["$year-$md"] = 'eid';
    return $out;
}

/** [key, lead] if $day is a special day (lead 0) or within its lead-up, else null. */
function kafunda_mkt_special_day(DateTime $day) {
    $specials = kafunda_mkt_specials();
    for ($lead = 0; $lead <= 3; $lead++) {
        $d = (clone $day)->modify("+$lead day");
        $key = kafunda_mkt_special_dates((int) $d->format('Y'))[$d->format('Y-m-d')] ?? '';
        if ($key && ($lead === 0 || ($specials[$key]['lead'] ?? 0) >= $lead)) return [$key, $lead];
    }
    return null;
}

/**
 * The story of one day, decided once and remembered (so all pushes + the email agree).
 * kind: special (holiday or its lead-up) | offer (every other day)
 */
function kafunda_mkt_day_plan(DateTime $day) {
    $key = $day->format('Y-m-d');
    $plans = get_option('kafunda_mkt_day_plans', []);
    if (!is_array($plans)) $plans = [];
    if (isset($plans[$key])) return $plans[$key];

    $n = (int) floor(strtotime($key . ' 12:00 UTC') / DAY_IN_SECONDS); // day number, drives the rotation
    $plan = ['date' => $key, 'n' => $n, 'kind' => 'offer'];
    if ($special = kafunda_mkt_special_day($day)) {
        $plan['kind'] = 'special';
        $plan['special'] = $special;
    }
    $plans[$key] = $plan;
    ksort($plans);
    update_option('kafunda_mkt_day_plans', array_slice($plans, -21, null, true), false);
    return $plan;
}

/** Short label for the dashboard: "Product pushes…", "Valentine's Day (in 2 days)"… */
function kafunda_mkt_plan_label($plan) {
    if (($plan['kind'] ?? '') !== 'special') return 'Product pushes — a different bottle with every push';
    [$key, $lead] = $plan['special'];
    $sp = kafunda_mkt_specials()[$key];
    $label = $lead ? "Lead-up to {$sp['name']} (" . ($lead === 1 ? 'tomorrow' : "in $lead days") . ')' : $sp['name'];
    return $label . ($sp['tone'] === 'quiet' ? ' — one greeting, no products' : (empty($sp['themes']) ? '' : ' + a fitting bottle'));
}

function kafunda_mkt_product_url($product) {
    return kafunda_mkt_auto_opts()['link'] === 'wp' ? get_permalink($product->get_id()) : kafunda_mkt_shop_url('/product/' . $product->get_id());
}

/** Shop page for a theme (or the whole shop). */
function kafunda_mkt_theme_url($theme) {
    $wp = kafunda_mkt_auto_opts()['link'] === 'wp';
    $cats = $theme ? kafunda_mkt_theme_cats($theme) : [];
    if (!$cats) return $wp ? (function_exists('wc_get_page_permalink') ? wc_get_page_permalink('shop') : home_url('/shop/')) : kafunda_mkt_shop_url('/shop');
    // Biggest match: "Wines", not whichever small wine category sorts first.
    usort($cats, function ($a, $b) { return $b->count <=> $a->count; });
    if ($wp) { $link = get_term_link($cats[0]); return is_wp_error($link) ? home_url('/shop/') : $link; }
    return kafunda_mkt_shop_url('/shop?' . http_build_query(['category' => $cats[0]->name]));
}

function kafunda_mkt_utm($url, $medium, $campaign) {
    return add_query_arg(['utm_source' => $medium === 'push' ? 'onesignal' : 'newsletter', 'utm_medium' => $medium, 'utm_campaign' => $campaign], $url);
}

/** Push wording for a product: [title, message] templates. Only real price cuts talk about savings. */
function kafunda_mkt_offer_templates($was, DateTime $at, $sold) {
    $hour = (int) $at->format('G');
    if ($was) {
        if ($hour < 11) {
            return [['{emoji} Save {save} on {short}', '{name}: now {price}, was {was}. Delivered in 1–2 hours.'],
                    ['{emoji} Morning deal: {short}', '{name} for {price} instead of {was}. Order now, pay on delivery.']];
        }
        if ($hour < 15) {
            return [['Lunch-break deal {emoji}', '{name}: {price}, down from {was}. At your door in 1–2 hours.'],
                    ['{emoji} Save {save} on {short}', 'Now {price} instead of {was}. Order in two taps.']];
        }
        if ($hour < 18) {
            return [['Beat the evening rush {emoji}', 'Order {name} now for {price} (was {was}) and it arrives before you\'re home.'],
                    ['{emoji} Save {save} on {short}', '{name} for {price}, was {was}. Delivered in 1–2 hours.']];
        }
        return [['Tonight\'s deal {emoji}', 'Unwind with {name}: {price} instead of {was}. Delivered in 1–2 hours.'],
                ['{emoji} Save {save} on {short}', '{name} for {price}, was {was}. Order now.']];
    }
    if ($hour < 11) {
        $t = [['{emoji} Today\'s pick: {short}', '{name} for {price}. Order now, delivered in 1–2 hours.'],
              ['{emoji} {theme} for today: {short}', '{name}, {price}. Pay with Mobile Money, card or cash.']];
    } elseif ($hour < 15) {
        $t = [['Lunch-break order? {emoji}', '{name}, {price}. At your door in 1–2 hours.'],
              ['{emoji} {short} for {price}', 'Order in two taps, delivered in 1–2 hours.']];
    } elseif ($hour < 18) {
        $t = [['Beat the evening rush {emoji}', 'Order {name} now for {price} and it arrives before you\'re home.'],
              ['{emoji} {short} for {price}', 'Order now and it\'s there this evening.']];
    } else {
        $t = [['Tonight\'s pick {emoji}', 'Unwind with {name}: {price}. Delivered in 1–2 hours.'],
              ['{emoji} {short} for {price}', 'Order now, delivered in 1–2 hours.']];
    }
    if ($at->format('N') === '5' && $hour >= 15) $t[] = ['🎉 Weekend starts now {emoji}', '{name} for {price}. Delivered in 1–2 hours.'];
    if ($sold >= 10) $t[] = ['{emoji} Customer favourite: {short}', '{name} for {price}. Delivered in 1–2 hours.'];
    return $t;
}

/**
 * Push + email content for slot $i (0 = first of the day).
 * Returns title, message (push), subject, heading, body (email), theme, products (ids), link, cta, products_heading, no_email, skip.
 */
function kafunda_mkt_auto_content(array $plan, DateTime $at, $i) {
    $themes = kafunda_mkt_themes();
    $close = "Delivered across Kampala in 1–2 hours. Pay with Mobile Money, card or cash on delivery.";
    $c = ['theme' => '', 'products' => [], 'link' => kafunda_mkt_theme_url(''), 'cta' => 'Order now',
        'products_heading' => 'Today\'s picks', 'no_email' => false, 'skip' => false];

    $sp = null;
    $lead = 0;
    if (($plan['kind'] ?? '') === 'special') {
        [$key, $lead] = $plan['special'];
        $sp = kafunda_mkt_specials()[$key];
        if ($sp['tone'] === 'quiet') {
            // One respectful message, nothing to buy, no email.
            if ($i > 0) return ['skip' => true, 'title' => $sp['name'] . ' — one message only'];
            [$c['title'], $c['message']] = $sp['lines'][0];
            return ['no_email' => true] + $c;
        }
    }

    [$th, $p] = kafunda_mkt_pick_offer(kafunda_mkt_slot_themes($plan, $i));
    if (!$p && !$sp) return ['skip' => true, 'title' => 'Nothing in stock to offer'];

    if ($p) {
        [$label, $emoji, , $tip] = $themes[$th];
        $now = (float) $p->get_price();
        $was = kafunda_mkt_was_price($p);
        $name = html_entity_decode(wp_strip_all_tags($p->get_name()), ENT_QUOTES, 'UTF-8');
        $map = ['{theme}' => $label, '{emoji}' => $emoji, '{name}' => $name,
            '{short}' => mb_strlen($name) > 30 ? rtrim(mb_substr($name, 0, 28)) . '…' : $name,
            '{price}' => kafunda_mkt_ugx($now), '{was}' => kafunda_mkt_ugx($was), '{save}' => kafunda_mkt_ugx($was - $now)];
        $t = kafunda_mkt_offer_templates($was, $at, (int) $p->get_total_sales());
        [$title, $msg] = $t[($plan['n'] + $i) % count($t)];
        // Holidays replace the title, so the message alone has to name the bottle.
        if ($sp) $msg = $was ? '{name} for {price}, was {was}. Delivered in 1–2 hours.' : '{name} for {price}. Delivered in 1–2 hours.';
        // Up to 3 more from the same shelf for the email.
        $more = array_filter(kafunda_mkt_fast_sellers($th), function ($x) use ($p) { return $x->get_id() !== $p->get_id(); });
        shuffle($more);
        $c['theme'] = $th;
        $c['title'] = strtr($title, $map);
        $c['message'] = strtr($msg, $map);
        $c['subject'] = strtr('{emoji} {short} for {price}', $map);
        $c['heading'] = strtr('Today\'s {theme} picks {emoji}', $map);
        $sale = kafunda_mkt_campaign($at);
        $c['body'] = ($sale ? "{$sale['name']} is on. " : '') . "Here's what we picked for you today.\n\n$tip\n\n$close";
        $c['products'] = array_merge([$p->get_id()], array_map(function ($x) { return $x->get_id(); }, array_slice($more, 0, 3)));
        $c['products_heading'] = 'Today\'s ' . strtolower($label) . ' picks';
        $c['link'] = kafunda_mkt_product_url($p);
        $c['cta'] = 'Shop all ' . strtolower($label);
        $c['email_link'] = kafunda_mkt_theme_url($th);
        $c['image'] = (string) wp_get_attachment_image_url($p->get_image_id(), 'large');
        kafunda_mkt_mark_featured($p->get_id());
        // The running sale goes on every product push; holidays keep their own title.
        if ($sale) {
            if (!$sp) $c['title'] = $sale['emoji'] . ' ' . $sale['name'] . ' · ' . preg_replace('/^[^\p{L}\p{N}]+/u', '', $c['title'], 1);
            $c['message'] .= " {$sale['name']} ends {$sale['ends']}.";
        }
    }

    if ($sp) {
        // Holidays keep their greeting as the title; the message sells the product when there is one.
        $when = ['', 'tomorrow', 'in 2 days', 'in 3 days'][$lead];
        $line = $lead ? $sp['lead_line'] : $sp['lines'][$i % count($sp['lines'])];
        $mail = $lead ? $sp['lead_email'] : $sp['email'];
        $c['title'] = str_replace('{when}', $when, $line[0]);
        if (!$p) $c['message'] = str_replace('{when}', $when, $line[1]);
        $c['subject'] = $c['heading'] = str_replace('{when}', $when, $mail[0]);
        $c['body'] = str_replace('{when}', $when, $mail[1]) . "\n\n" . $close;
    }
    $c['title'] = mb_substr($c['title'], 0, 65);
    $c['message'] = mb_substr($c['message'], 0, 240);
    return $c;
}

/** Builds + sends (or schedules) one automatic push for slot $i. Returns a log entry. */
function kafunda_mkt_auto_send(DateTime $at, $schedule, $i = 0) {
    $plan = kafunda_mkt_day_plan($at);
    $c = kafunda_mkt_auto_content($plan, $at, $i);
    if (!empty($c['skip'])) return ['status' => 'skipped', 'title' => $c['title'], 'at' => $at->getTimestamp()];
    $campaign = 'auto_' . $plan['kind'] . ($c['theme'] ? '_' . $c['theme'] : '') . '_' . $at->format('Hi');
    $r = kafunda_mkt_send_push([
        'title' => $c['title'],
        'message' => $c['message'],
        'url' => kafunda_mkt_utm($c['link'], 'push', $campaign),
        'image' => $c['image'] ?? '',
        'audience' => kafunda_mkt_auto_opts()['audience'],
        'send_after' => $schedule ? $at->format(DATE_ATOM) : '',
    ]);
    return [
        'status' => is_wp_error($r) ? 'error' : ($schedule ? 'scheduled' : 'sent'),
        'error' => is_wp_error($r) ? $r->get_error_message() : '',
        'id' => is_wp_error($r) ? '' : $r['id'],
        'title' => $c['title'],
        'message' => $c['message'],
        'kind' => $plan['kind'],
        'subject' => $c['subject'] ?? $c['title'],
        'heading' => $c['heading'] ?? $c['title'],
        'body' => $c['body'] ?? $c['message'],
        'products' => $c['products'],
        'products_heading' => $c['products_heading'],
        'link' => $c['email_link'] ?? $c['link'],
        'cta' => $c['cta'],
        'no_email' => !empty($c['no_email']),
        'campaign' => $campaign,
        'at' => $at->getTimestamp(),
    ];
}

/** Product as an email card. */
function kafunda_mkt_product_card($product, $campaign) {
    $was = kafunda_mkt_was_price($product);
    return [
        'name'  => wp_strip_all_tags($product->get_name()),
        'price' => kafunda_mkt_ugx(wc_get_price_to_display($product)),
        'was'   => $was ? kafunda_mkt_ugx($was) : '',
        'image' => (string) wp_get_attachment_image_url($product->get_image_id(), 'medium'),
        'url'   => kafunda_mkt_utm(kafunda_mkt_product_url($product), 'email', $campaign),
    ];
}

/** The email that goes with an automatic push. Products are re-checked: still in stock. */
function kafunda_mkt_auto_email_payload($x, $campaign) {
    if (!empty($x['no_email'])) return null;
    $ids = isset($x['kind']) ? (array) ($x['products'] ?? []) : [(int) ($x['product'] ?? 0)]; // entries from before v2.4: one product
    $cards = [];
    foreach ($ids as $id) {
        $p = function_exists('wc_get_product') ? wc_get_product((int) $id) : null;
        if (!$p || !$p->is_in_stock()) continue;
        $cards[] = kafunda_mkt_product_card($p, $campaign);
        if (count($cards) >= 4) break;
    }
    $kind = $x['kind'] ?? 'sale';
    if ($kind !== 'special' && !$cards) return null; // sold out before the email went out
    $close = "Delivered across Kampala in 1–2 hours. Pay with Mobile Money, card or cash on delivery.";
    return [
        'preheader' => $x['message'] ?? '',
        'heading'   => $x['heading'] ?? ($x['title'] ?? ''),
        'body'      => $x['body'] ?? (($x['message'] ?? '') . "\n\n" . $close),
        'cta_text'  => $x['cta'] ?? 'Order now',
        'cta_url'   => kafunda_mkt_utm($x['link'] ?? kafunda_mkt_theme_url(''), 'email', $campaign),
        'products'  => $cards,
        'products_heading' => $x['products_heading'] ?? 'Today\'s picks',
    ];
}

/** Does this slot also send an email? */
function kafunda_mkt_auto_slot_emails($slot) {
    $a = kafunda_mkt_auto_opts();
    if ($a['email'] === 'all') return true;
    if ($a['email'] !== 'first') return false;
    $slots = (array) $a['slots'];
    sort($slots);
    return $slot === ($slots[0] ?? '');
}

/**
 * When an automatic push's time arrives, queue its email to everyone who has
 * ordered (all orders, new ones included) + offer subscribers. Sent 25/minute
 * by the campaign queue; shows up in the Email tab like any campaign.
 */
function kafunda_mkt_auto_emails() {
    global $wpdb;
    $t = kafunda_mkt_tables();
    $log = kafunda_mkt_auto_log();
    $changed = false;
    foreach ($log as $key => $x) {
        if (($x['email'] ?? '') !== 'pending' || ($x['at'] ?? PHP_INT_MAX) > time()) continue;
        $changed = true;
        if ($x['at'] < time() - 3 * HOUR_IN_SECONDS) { $log[$key]['email'] = 'skipped (too late)'; continue; }
        $campaign = $x['campaign'] ?? 'auto_' . (new DateTime('@' . (int) $x['at']))->setTimezone(kafunda_mkt_tz())->format('Hi');
        $payload = kafunda_mkt_auto_email_payload($x, $campaign);
        $recipients = $payload ? kafunda_mkt_audience('all') : [];
        if (!$payload || !$recipients) { $log[$key]['email'] = $payload ? 'skipped (no recipients)' : 'skipped (offers ended)'; continue; }
        $wpdb->insert($t['campaigns'], [
            'subject' => $x['subject'] ?? $x['title'], 'payload' => wp_json_encode($payload), 'audience' => 'auto',
            'status' => 'queued', 'recipients' => wp_json_encode($recipients),
            'total' => count($recipients), 'created_at' => kafunda_mkt_now(),
        ]);
        $log[$key]['email'] = 'queued for ' . count($recipients);
    }
    if ($changed) kafunda_mkt_auto_log($log);
}

/** Makes sure today's and tomorrow's slots are scheduled in OneSignal. Cheap; runs every few minutes. */
function kafunda_mkt_auto_plan($force = false) {
    $a = kafunda_mkt_auto_opts();
    $o = kafunda_mkt_opts();
    if (empty($a['on']) || !$o['onesignal_rest_key']) return;
    // Pushes queued by an older version of this code are rebuilt once with the new messages.
    if (get_option('kafunda_mkt_auto_ver') !== '2.5') {
        kafunda_mkt_auto_cancel_future();
        delete_option('kafunda_mkt_day_plans'); // plans made by older code can still say "funny day"
        update_option('kafunda_mkt_auto_ver', '2.5', false);
        $force = true;
    }
    if (!$force && get_transient('kafunda_mkt_auto_plan_lock')) return;
    set_transient('kafunda_mkt_auto_plan_lock', 1, 5 * MINUTE_IN_SECONDS);

    $tz = kafunda_mkt_tz();
    $log = kafunda_mkt_auto_log();
    $changed = false;
    $slots = (array) $a['slots'];
    sort($slots);
    foreach ([0, 1] as $add) {
        $day = (new DateTime('now', $tz))->modify("+$add day")->format('Y-m-d');
        foreach ($slots as $i => $slot) {
            $at = DateTime::createFromFormat('Y-m-d H:i', "$day $slot", $tz);
            if (!$at || $at->getTimestamp() < time() + 5 * MINUTE_IN_SECONDS) continue;
            $key = $at->format('Y-m-d H:i');
            // Already scheduled → skip. A failed attempt is retried on the next run (every ~5 min).
            if (isset($log[$key]) && ($log[$key]['status'] ?? '') !== 'error') continue;
            $log[$key] = kafunda_mkt_auto_send($at, true, $i);
            if ($log[$key]['status'] === 'scheduled' && empty($log[$key]['no_email']) && kafunda_mkt_auto_slot_emails($slot)) $log[$key]['email'] = 'pending';
            $changed = true;
        }
    }
    if ($changed) kafunda_mkt_auto_log($log);
}

/** Cancels everything still waiting in OneSignal (used when turning off / changing times). */
function kafunda_mkt_auto_cancel_future() {
    $o = kafunda_mkt_opts();
    $log = kafunda_mkt_auto_log();
    foreach ($log as $key => $entry) {
        if (($entry['status'] ?? '') !== 'scheduled' || ($entry['at'] ?? 0) <= time() + 60) continue;
        if (!empty($entry['id'])) {
            kafunda_mkt_onesignal('DELETE', 'notifications/' . rawurlencode($entry['id']) . '?app_id=' . rawurlencode($o['onesignal_app_id']));
        }
        unset($log[$key]);
    }
    kafunda_mkt_auto_log($log);
}

/** Push sign-up on kafundawines.com (optional — OneSignal allows ONE website per app). */
add_action('init', function () {
    // Service worker served from the site root: /kafunda-push-sw
    $path = trim((string) parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/');
    if ($path !== 'kafunda-push-sw') return;
    header('Content-Type: application/javascript; charset=utf-8');
    header('Service-Worker-Allowed: /');
    header('Cache-Control: public, max-age=3600');
    echo 'importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");';
    exit;
}, 0);

add_action('wp_footer', function () {
    $o = kafunda_mkt_opts();
    if (empty($o['push_on_site']) || !$o['onesignal_app_id'] || is_admin()) return;
    $app = wp_json_encode($o['onesignal_app_id']);
    $thanks = function_exists('is_order_received_page') && is_order_received_page();
    echo '<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>';
    echo "<script>window.OneSignalDeferred=window.OneSignalDeferred||[];"
        . "OneSignalDeferred.push(async function(OneSignal){await OneSignal.init({appId:{$app},serviceWorkerPath:'kafunda-push-sw',serviceWorkerParam:{scope:'/'},notifyButton:{enable:false},"
        . "promptOptions:{slidedown:{prompts:[{type:'push',autoPrompt:true,delay:{pageViews:2,timeDelay:20},text:{actionMessage:\"Get today's offers and order updates from Kafunda — no spam.\",acceptButton:'Allow',cancelButton:'Not now'}}]}}});"
        . ($thanks ? "OneSignal.User.removeTags(['cart_update','cart_items']);" : '')
        . "});"
        // After add-to-cart: tag for the abandoned-cart Journey + ask for push at a high-intent moment.
        . "if(window.jQuery){jQuery(document.body).on('added_to_cart',function(){OneSignalDeferred.push(function(OneSignal){"
        . "OneSignal.User.addTags({cart_update:String(Math.floor(Date.now()/1000))});"
        . "if(!OneSignal.User.PushSubscription.optedIn){OneSignal.Slidedown.promptPush();}});});}"
        . "</script>";
}, 60);

/* ------------------------------------------------------------------------ */
/* Unsubscribe                                                               */
/* ------------------------------------------------------------------------ */

add_action('init', function () {
    if (empty($_GET['kafunda_unsubscribe'])) return;
    $email = kafunda_mkt_clean_email(rawurldecode(wp_unslash($_GET['e'] ?? '')));
    $token = sanitize_text_field(wp_unslash($_GET['t'] ?? ''));
    $ok = $email && hash_equals(kafunda_mkt_unsub_token($email), $token);
    if ($ok) {
        global $wpdb;
        $t = kafunda_mkt_tables();
        kafunda_mkt_add_subscriber($email, '', '', 'unsubscribe', false);
        $wpdb->update($t['subs'], ['status' => 'unsubscribed', 'unsubscribed_at' => kafunda_mkt_now()], ['email' => $email]);
        $wpdb->update($t['carts'], ['status' => 'lost'], ['email' => $email, 'status' => 'open']);
    }
    status_header($ok ? 200 : 400);
    nocache_headers();
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title>'
        . '<div style="font-family:Arial,sans-serif;max-width:420px;margin:80px auto;padding:0 16px;text-align:center">'
        . ($ok
            ? '<h1 style="font-size:22px">You\'re unsubscribed</h1><p style="color:#555">' . esc_html($email) . ' won\'t get offer or reminder emails from Kafunda any more.</p>'
            : '<h1 style="font-size:22px">Link not valid</h1><p style="color:#555">This unsubscribe link is broken. Reply to any email and we\'ll remove you.</p>')
        . '<p><a href="' . esc_url(home_url('/')) . '" style="color:#228f22">Back to the shop</a></p></div>';
    exit;
}, 1);

/* ------------------------------------------------------------------------ */
/* Public endpoints for shop.kafundawines.com (no secret needed)             */
/* ------------------------------------------------------------------------ */

add_action('rest_api_init', function () {
    $ns = 'kafunda/v1';
    $open = ['permission_callback' => '__return_true'];

    // Save a shop cart. Items are looked up here, so only real products are stored.
    register_rest_route($ns, '/mkt/public/cart', $open + ['methods' => 'POST', 'callback' => function (WP_REST_Request $r) {
        if (!kafunda_mkt_rate_ok('pcart', 120, HOUR_IN_SECONDS)) return new WP_Error('slow_down', 'Too many requests', ['status' => 429]);
        $token = kafunda_mkt_clean_token($r->get_param('token'));
        if (!$token) return new WP_Error('bad_token', 'Invalid token', ['status' => 400]);

        $items = []; $subtotal = 0;
        foreach (array_slice((array) $r->get_param('items'), 0, 50) as $line) {
            $product = function_exists('wc_get_product') ? wc_get_product((int) ($line['id'] ?? 0)) : null;
            if (!$product || !$product->is_purchasable()) continue;
            $qty = max(1, min(999, (int) ($line['quantity'] ?? 1)));
            $price = (float) $product->get_price();
            $items[] = [
                'id' => $product->get_id(), 'name' => $product->get_name(), 'price' => $price, 'quantity' => $qty,
                'image' => (string) wp_get_attachment_image_url($product->get_image_id(), 'thumbnail'),
            ];
            $subtotal += $price * $qty;
        }
        if (!$items) return ['ok' => false];
        $ok = kafunda_mkt_upsert_cart($token, [
            'email' => $r->get_param('email'), 'phone' => $r->get_param('phone'), 'name' => $r->get_param('name'),
            'items' => $items, 'subtotal' => $subtotal,
        ], 'shop');
        return ['ok' => $ok];
    }]);

    register_rest_route($ns, '/mkt/public/convert', $open + ['methods' => 'POST', 'callback' => function (WP_REST_Request $r) {
        $token = kafunda_mkt_clean_token($r->get_param('token'));
        if ($token) kafunda_mkt_convert_cart($token, (int) $r->get_param('order_id'));
        return ['ok' => true];
    }]);

    // Restore lines only (no personal data) — the token is an unguessable random string.
    register_rest_route($ns, '/mkt/public/restore', $open + ['methods' => 'GET', 'callback' => function (WP_REST_Request $r) {
        global $wpdb;
        $t = kafunda_mkt_tables();
        $token = kafunda_mkt_clean_token($r->get_param('token'));
        $row = $token ? $wpdb->get_row($wpdb->prepare("SELECT items FROM {$t['carts']} WHERE token = %s", $token)) : null;
        if (!$row) return new WP_Error('not_found', 'Cart not found', ['status' => 404]);
        $items = array_map(function ($i) { return ['id' => (string) ($i['id'] ?? ''), 'quantity' => (int) ($i['quantity'] ?? 1)]; },
            (array) json_decode($row->items, true));
        return ['items' => $items];
    }]);

    register_rest_route($ns, '/mkt/public/subscribe', $open + ['methods' => 'POST', 'callback' => function (WP_REST_Request $r) {
        if (!kafunda_mkt_rate_ok('psub', 10, HOUR_IN_SECONDS)) return new WP_Error('slow_down', 'Too many sign-ups. Try later.', ['status' => 429]);
        $ok = kafunda_mkt_add_subscriber($r->get_param('email'), (string) $r->get_param('name'), '', (string) ($r->get_param('source') ?: 'popup'), true);
        return $ok ? ['ok' => true] : new WP_Error('bad_email', 'Please enter a valid email address.', ['status' => 400]);
    }]);
});

/* ------------------------------------------------------------------------ */
/* Dashboard: kafundawines.com/marketing                                      */
/* ------------------------------------------------------------------------ */

function kafunda_mkt_can() { return current_user_can('manage_woocommerce') || current_user_can('manage_options'); }

function kafunda_mkt_flash($type = null, $text = null) {
    $key = 'kafunda_mkt_flash_' . get_current_user_id();
    if ($type === null) { $f = get_transient($key); delete_transient($key); return $f ?: null; }
    set_transient($key, ['type' => $type, 'text' => $text], 120);
}

function kafunda_mkt_stats() {
    global $wpdb;
    $t = kafunda_mkt_tables();
    $since = gmdate('Y-m-d H:i:s', time() - 30 * DAY_IN_SECONDS);
    $hourAgo = gmdate('Y-m-d H:i:s', time() - HOUR_IN_SECONDS);
    $v = function ($sql) use ($wpdb) { return (int) $wpdb->get_var($sql); };
    $all = kafunda_mkt_audience('all', $skipped);
    return [
        'abandoned'   => $v($wpdb->prepare("SELECT COUNT(*) FROM {$t['carts']} WHERE created_at > %s AND status IN ('open','lost','recovered') AND (status <> 'open' OR updated_at < %s)", $since, $hourAgo)),
        'open_value'  => $v($wpdb->prepare("SELECT COALESCE(SUM(subtotal),0) FROM {$t['carts']} WHERE created_at > %s AND status = 'open' AND updated_at < %s", $since, $hourAgo)),
        'recovered'   => $v($wpdb->prepare("SELECT COUNT(*) FROM {$t['carts']} WHERE created_at > %s AND status = 'recovered'", $since)),
        'recovered_value' => $v($wpdb->prepare("SELECT COALESCE(SUM(subtotal),0) FROM {$t['carts']} WHERE created_at > %s AND status = 'recovered'", $since)),
        'converted'   => $v($wpdb->prepare("SELECT COUNT(*) FROM {$t['carts']} WHERE created_at > %s AND status = 'converted'", $since)),
        'reminders'   => $v($wpdb->prepare("SELECT COALESCE(SUM(reminders),0) FROM {$t['carts']} WHERE created_at > %s", $since)),
        'subscribers' => $v("SELECT COUNT(*) FROM {$t['subs']} WHERE status = 'subscribed'"),
        'aud_subscribers' => count(kafunda_mkt_audience('subscribers')),
        'aud_customers'   => count(kafunda_mkt_audience('customers')),
        'aud_all'         => count($all),
        'skipped'         => $skipped,
    ];
}

/**
 * Every customer found in all orders (new ones included), merged by email/phone:
 * email, phone, name, order count, money spent, last order, subscription status.
 */
function kafunda_mkt_contacts() {
    global $wpdb;
    $t = kafunda_mkt_tables();
    $people = [];
    $page = 1;
    do {
        $orders = wc_get_orders([
            'type' => 'shop_order', 'limit' => 200, 'page' => $page, 'orderby' => 'date', 'order' => 'ASC',
            'status' => ['wc-completed', 'wc-processing', 'wc-on-hold', 'wc-pending', 'wc-cancelled', 'wc-failed', 'wc-refunded'],
        ]);
        foreach ($orders as $o) {
            if (!is_a($o, 'WC_Order')) continue;
            $email = kafunda_mkt_clean_email($o->get_billing_email());
            $phone = kafunda_mkt_phone_key($o->get_billing_phone());
            if (!$email && !$phone) continue;
            $key = $email ?: 'tel:' . $phone;
            if (!isset($people[$key]) && $phone && isset($people['tel:' . $phone])) { $people[$key] = $people['tel:' . $phone]; unset($people['tel:' . $phone]); }
            $paid = in_array($o->get_status(), ['completed', 'processing', 'on-hold'], true);
            $p = $people[$key] ?? ['email' => '', 'phone' => '', 'name' => '', 'orders' => 0, 'spent' => 0, 'last' => ''];
            $p['email'] = $email ?: $p['email'];
            $p['phone'] = $phone ? '0' . $phone : $p['phone'];
            $name = trim($o->get_billing_first_name() . ' ' . $o->get_billing_last_name());
            if ($name) $p['name'] = $name;
            if ($paid) { $p['orders']++; $p['spent'] += (float) $o->get_total(); }
            $d = $o->get_date_created();
            if ($d) $p['last'] = $d->date('Y-m-d');
            $people[$key] = $p;
        }
        $page++;
    } while (count($orders) === 200 && $page < 200);

    $unsub = array_flip((array) $wpdb->get_col("SELECT email FROM {$t['subs']} WHERE status = 'unsubscribed'"));
    foreach ($people as &$p) $p['status'] = $p['email'] ? (isset($unsub[$p['email']]) ? 'unsubscribed' : 'emailable') : 'phone only';
    unset($p);
    uasort($people, function ($a, $b) { return strcmp($b['last'], $a['last']); });
    return array_values($people);
}

function kafunda_mkt_export_contacts() {
    $rows = kafunda_mkt_contacts();
    nocache_headers();
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="kafunda-customers-' . gmdate('Y-m-d') . '.csv"');
    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF"); // so Excel shows UGX / names correctly
    fputcsv($out, ['Name', 'Email', 'Phone', 'Paid orders', 'Total spent (UGX)', 'Last order', 'Email status']);
    foreach ($rows as $r) {
        // Leading apostrophe stops Excel turning phone numbers into formulas/numbers.
        fputcsv($out, [$r['name'], $r['email'], $r['phone'] ? "'" . $r['phone'] : '', $r['orders'], round($r['spent']), $r['last'], $r['status']]);
    }
    fclose($out);
    exit;
}

/** Handles dashboard form posts, then redirects (so refresh never re-sends). */
function kafunda_mkt_handle_post() {
    if (empty($_POST['kmk_action'])) return;
    if (!wp_verify_nonce($_POST['_kmk'] ?? '', 'kafunda_mkt_dash')) {
        kafunda_mkt_flash('error', 'Your session expired — please try again.');
        wp_safe_redirect(kafunda_mkt_dash_url()); exit;
    }
    global $wpdb;
    $t = kafunda_mkt_tables();
    $p = wp_unslash($_POST);
    $action = sanitize_key($p['kmk_action']);
    $tab = 'overview';

    if ($action === 'send_push') {
        $tab = 'push';
        $f = [
            'title'    => sanitize_text_field($p['title'] ?? ''),
            'message'  => sanitize_textarea_field($p['message'] ?? ''),
            'url'      => esc_url_raw($p['url'] ?? ''),
            'image'    => esc_url_raw($p['image'] ?? ''),
            'audience' => in_array($p['audience'] ?? '', ['web', 'app'], true) ? $p['audience'] : 'all',
            'send_after' => '',
        ];
        if (!empty($p['when'])) {
            try {
                $dt = new DateTime($p['when'], wp_timezone());
                if ($dt->getTimestamp() > time() + 60) $f['send_after'] = $dt->format(DATE_ATOM);
            } catch (Exception $ex) { /* ignore bad date: send now */ }
        }
        if ($f['url'] && strpos($f['url'], 'utm_') === false) {
            $f['url'] = add_query_arg(['utm_source' => 'onesignal', 'utm_medium' => 'push', 'utm_campaign' => sanitize_title($f['title']) ?: 'push'], $f['url']);
        }
        if (!$f['title'] || !$f['message']) {
            kafunda_mkt_flash('error', 'Title and message are required.');
        } else {
            $r = kafunda_mkt_send_push($f);
            is_wp_error($r)
                ? kafunda_mkt_flash('error', $r->get_error_message())
                : kafunda_mkt_flash('ok', $f['send_after'] ? 'Push scheduled.' : 'Push sent! Delivery numbers appear below within a minute.');
        }
    }

    if ($action === 'send_email') {
        $tab = 'email';
        $subject = sanitize_text_field($p['subject'] ?? '');
        $cta_url = esc_url_raw($p['cta_url'] ?? '');
        if ($cta_url && strpos($cta_url, 'utm_') === false) {
            $cta_url = add_query_arg(['utm_source' => 'newsletter', 'utm_medium' => 'email', 'utm_campaign' => sanitize_title($subject) ?: 'email'], $cta_url);
        }
        $payload = [
            'heading'   => sanitize_text_field($p['heading'] ?? ''),
            'preheader' => sanitize_text_field($p['preheader'] ?? ''),
            'body'      => sanitize_textarea_field($p['body'] ?? ''),
            'image_url' => esc_url_raw($p['image_url'] ?? ''),
            'cta_text'  => sanitize_text_field($p['cta_text'] ?? ''),
            'cta_url'   => $cta_url,
        ];
        // Keep the draft so a test (or an error) doesn't lose what was typed.
        set_transient('kafunda_mkt_draft_' . get_current_user_id(), $p, DAY_IN_SECONDS);

        if (!$subject || !$payload['heading'] || !$payload['body']) {
            kafunda_mkt_flash('error', 'Subject, heading and message are required.');
        } elseif (($p['mode'] ?? '') === 'test') {
            $to = kafunda_mkt_clean_email($p['test_email'] ?? '');
            if (!$to) kafunda_mkt_flash('error', 'Enter a valid address for the test.');
            elseif ($why = kafunda_mkt_email_problem($to)) kafunda_mkt_flash('error', "$to is skipped as a wrong address: $why.");
            elseif (kafunda_mkt_send($to, '[TEST] ' . $subject, $payload)) kafunda_mkt_flash('ok', "Test sent to $to — check the inbox and spam folder.");
            else kafunda_mkt_flash('error', 'WordPress could not send the email. Check your SMTP / email plugin (WP Mail SMTP).');
        } else {
            $audience = in_array($p['audience'] ?? '', ['subscribers', 'customers', 'all'], true) ? $p['audience'] : 'all';
            $recipients = kafunda_mkt_audience($audience);
            if (!$recipients) {
                kafunda_mkt_flash('error', 'No one to send to in that audience yet.');
            } else {
                $wpdb->insert($t['campaigns'], [
                    'subject' => $subject, 'payload' => wp_json_encode($payload), 'audience' => $audience,
                    'status' => 'queued', 'recipients' => wp_json_encode($recipients),
                    'total' => count($recipients), 'created_at' => kafunda_mkt_now(),
                ]);
                delete_transient('kafunda_mkt_draft_' . get_current_user_id());
                kafunda_mkt_flash('ok', 'Queued for ' . count($recipients) . ' people. Emails go out 25 per minute — keep this page open to speed it up.');
            }
        }
    }

    if ($action === 'save_auto') {
        $tab = 'push';
        $slots = [];
        foreach ((array) ($p['slot'] ?? []) as $i => $time) {
            if (empty($p['slot_on'][$i])) continue;
            if (preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', (string) $time)) $slots[] = $time;
        }
        $slots = array_values(array_unique($slots));
        sort($slots);
        $new = [
            'on' => empty($p['auto_on']) ? 0 : 1,
            'slots' => $slots,
            'audience' => in_array($p['auto_audience'] ?? '', ['web', 'app'], true) ? $p['auto_audience'] : 'all',
            'link' => ($p['auto_link'] ?? '') === 'wp' ? 'wp' : 'shop',
            'email' => in_array($p['auto_email'] ?? '', ['off', 'first', 'all'], true) ? $p['auto_email'] : 'first',
        ];
        // Anything already queued in OneSignal is rebuilt with the new settings.
        kafunda_mkt_auto_cancel_future();
        update_option('kafunda_mkt_auto', $new, false);
        if ($new['on'] && !kafunda_mkt_opts()['onesignal_rest_key']) {
            kafunda_mkt_flash('error', 'Saved, but add your OneSignal REST API key in Settings before automatic pushes can go out.');
        } elseif ($new['on'] && !$slots) {
            kafunda_mkt_flash('error', 'Turn on at least one time slot.');
        } else {
            if ($new['on']) kafunda_mkt_auto_plan(true);
            kafunda_mkt_flash('ok', $new['on'] ? 'Automatic pushes are on — today\'s and tomorrow\'s are scheduled below.' : 'Automatic pushes are off. Scheduled ones were cancelled.');
        }
    }

    if ($action === 'auto_sample') {
        $tab = 'push';
        $entry = kafunda_mkt_auto_send(new DateTime('now', kafunda_mkt_tz()), false);
        $log = kafunda_mkt_auto_log();
        $log['sample ' . time()] = $entry;
        kafunda_mkt_auto_log($log);
        if ($entry['status'] === 'error') {
            kafunda_mkt_flash('error', $entry['error']);
        } else {
            // Show the matching email too — sent only to you, not to customers.
            $me = wp_get_current_user()->user_email;
            $payload = kafunda_mkt_auto_email_payload($entry, 'auto_sample');
            $mailed = $payload && $me && kafunda_mkt_send($me, '[SAMPLE] ' . ($entry['subject'] ?? $entry['title']), $payload);
            kafunda_mkt_flash('ok', 'Sample push sent: "' . $entry['title'] . '"' . ($mailed ? " — the matching email went to $me (only you)." : ''));
        }
    }

    if ($action === 'block_emails') {
        $tab = 'email';
        $bad = kafunda_mkt_bad_emails();
        $n = 0;
        foreach (preg_split('/[\s,;]+/', strtolower((string) ($p['emails'] ?? ''))) as $em) {
            if (!is_email($em)) continue;
            $bad[$em] = ['why' => 'blocked by hand', 'fails' => 0, 'blocked' => 1, 't' => time()];
            $n++;
        }
        kafunda_mkt_bad_emails($bad);
        kafunda_mkt_flash('ok', "$n address" . ($n === 1 ? '' : 'es') . ' will never be emailed.');
    }

    if ($action === 'unblock_email') {
        $tab = 'email';
        $bad = kafunda_mkt_bad_emails();
        unset($bad[strtolower(trim((string) ($p['email'] ?? '')))]);
        kafunda_mkt_bad_emails($bad);
        kafunda_mkt_flash('ok', 'Address allowed again.');
    }

    if ($action === 'cancel_campaign') {
        $tab = 'email';
        $wpdb->query($wpdb->prepare("UPDATE {$t['campaigns']} SET status = 'cancelled' WHERE id = %d AND status IN ('queued','sending')", (int) ($p['id'] ?? 0)));
        kafunda_mkt_flash('ok', 'Campaign stopped.');
    }

    if ($action === 'dismiss_cart') {
        $tab = 'carts';
        $wpdb->update($t['carts'], ['status' => 'lost'], ['id' => (int) ($p['id'] ?? 0)]);
    }

    if ($action === 'save_settings') {
        $tab = 'settings';
        $o = kafunda_mkt_opts();
        $o['shop_url']         = esc_url_raw($p['shop_url'] ?? $o['shop_url']);
        $o['from_name']        = sanitize_text_field($p['from_name'] ?? '');
        $o['from_email']       = sanitize_email($p['from_email'] ?? '');
        $o['whatsapp']         = preg_replace('/\D+/', '', $p['whatsapp'] ?? '');
        $o['reminders_on']     = empty($p['reminders_on']) ? 0 : 1;
        $o['capture_checkout'] = empty($p['capture_checkout']) ? 0 : 1;
        $o['push_on_site']     = empty($p['push_on_site']) ? 0 : 1;
        $o['onesignal_app_id'] = sanitize_text_field($p['onesignal_app_id'] ?? '');
        $key = trim((string) ($p['onesignal_rest_key'] ?? ''));
        if ($key !== '' && strpos($key, '•') === false) $o['onesignal_rest_key'] = sanitize_text_field($key);
        update_option('kafunda_mkt_settings', $o, false);
        kafunda_mkt_flash('ok', 'Settings saved.');
    }

    if ($action === 'test_settings') {
        $tab = 'settings';
        $to = kafunda_mkt_clean_email($p['test_to'] ?? '');
        $ok = $to && kafunda_mkt_send($to, '[TEST] Kafunda email check', [
            'heading' => 'Email is working', 'body' => 'If you can read this, WordPress can send Kafunda offer and cart emails.',
            'cta_text' => 'Visit the shop', 'cta_url' => home_url('/'),
        ]);
        $ok ? kafunda_mkt_flash('ok', "Test email sent to $to.")
            : kafunda_mkt_flash('error', 'WordPress could not send the email. Install and set up WP Mail SMTP (or your host\'s mail service), then try again.');
    }

    wp_safe_redirect(kafunda_mkt_dash_url($tab));
    exit;
}

/** Logged-in AJAX: push the email queue along while the dashboard is open. */
add_action('wp_ajax_kafunda_mkt_tick', function () {
    if (!kafunda_mkt_can()) wp_send_json_error();
    wp_send_json(kafunda_mkt_tick());
});

add_action('template_redirect', function () {
    $path = trim((string) parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/');
    if ($path !== KAFUNDA_MKT_SLUG) return;

    nocache_headers();
    if (!is_user_logged_in()) {
        wp_safe_redirect(wp_login_url(home_url('/' . KAFUNDA_MKT_SLUG . '/')));
        exit;
    }
    if (!kafunda_mkt_can()) wp_die('Only shop managers and administrators can open the marketing dashboard.', 'Not allowed', ['response' => 403]);

    if (($_GET['export'] ?? '') === 'contacts' && wp_verify_nonce($_GET['_kmk'] ?? '', 'kafunda_mkt_export')) {
        kafunda_mkt_export_contacts();
    }
    kafunda_mkt_handle_post();
    kafunda_mkt_render_dashboard();
    exit;
}, 0);

function kafunda_mkt_render_dashboard() {
    global $wpdb;
    $t = kafunda_mkt_tables();
    $o = kafunda_mkt_opts();
    $tab = sanitize_key($_GET['tab'] ?? 'overview');
    if (!in_array($tab, ['overview', 'push', 'email', 'carts', 'settings'], true)) $tab = 'overview';
    $flash = kafunda_mkt_flash();
    $s = kafunda_mkt_stats();
    $e = 'esc_html';
    $a = 'esc_attr';
    $nonce = wp_nonce_field('kafunda_mkt_dash', '_kmk', false, false);
    $pushReady = $o['onesignal_app_id'] && $o['onesignal_rest_key'];

    $carts = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$t['carts']} WHERE status = 'open' AND updated_at < %s AND created_at > %s ORDER BY updated_at DESC LIMIT 80",
        gmdate('Y-m-d H:i:s', time() - 30 * MINUTE_IN_SECONDS),
        gmdate('Y-m-d H:i:s', time() - 30 * DAY_IN_SECONDS)
    ));
    $ago = function ($mysql) {
        return human_time_diff(strtotime($mysql . ' UTC'), time()) . ' ago';
    };

    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Kafunda Marketing</title>';
    echo '<style>
:root{--g:#228f22;--gd:#1c7a1c;--gt:#eaf6ea;--ink:#141414;--mut:#71717a;--line:#ececec;--bg:#f6f6f4}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 -apple-system,Segoe UI,Roboto,Arial,sans-serif}
.wrap{max-width:1100px;margin:0 auto;padding:20px 16px 60px}
header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap}
h1{font-size:20px;margin:0;text-transform:uppercase;letter-spacing:-.01em;font-weight:900}
.sub{color:var(--mut);font-size:12px}
nav{display:flex;gap:4px;overflow-x:auto;background:#fff;border:1px solid var(--line);border-radius:14px;padding:4px;margin-bottom:18px}
nav a{flex-shrink:0;padding:9px 14px;border-radius:10px;text-decoration:none;color:var(--mut);font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
nav a.on{background:var(--g);color:#fff}
.badge{background:#fee2e2;color:#b91c1c;border-radius:99px;padding:0 6px;margin-left:4px;font-size:10px}
nav a.on .badge{background:rgba(255,255,255,.25);color:#fff}
.grid{display:grid;gap:16px}.g4{grid-template-columns:repeat(2,1fr)}@media(min-width:900px){.g4{grid-template-columns:repeat(4,1fr)}.g2{grid-template-columns:3fr 2fr}}
.card{background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden;min-width:0}
.card h2{margin:0;padding:12px 18px;border-bottom:1px solid var(--line);font-size:11px;text-transform:uppercase;letter-spacing:.1em}
.card .in{padding:18px}
.kpi{padding:14px 16px}.kpi .l{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--mut)}.kpi .v{font-size:24px;font-weight:900}.kpi .s{font-size:12px;color:var(--mut)}
label{display:block;margin-bottom:14px}label>span{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--mut);margin-bottom:5px}
input[type=text],input[type=url],input[type=email],input[type=password],input[type=datetime-local],textarea,select{width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:10px;font:inherit;font-size:16px;background:#fff}
input:focus,textarea:focus,select:focus{outline:2px solid rgba(34,143,34,.25);border-color:var(--g)}
.hint{font-size:11px;color:#a1a1aa;margin-top:4px;display:block;text-transform:none;letter-spacing:0;font-weight:400;font-style:normal}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:0;border-radius:10px;padding:11px 18px;font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:.08em;cursor:pointer;text-decoration:none}
.btn-g{background:var(--g);color:#fff;width:100%;padding:14px}.btn-g:hover{background:var(--gd)}.btn-g:disabled{opacity:.5}
.btn-o{background:#fff;border:1px solid #ddd;color:#333}.btn-w{background:#10b981;color:#fff}.btn-x{background:none;border:1px solid #ddd;color:#999;padding:8px 10px}
.row2{display:grid;gap:12px}@media(min-width:640px){.row2{grid-template-columns:1fr 1fr}}
.flash{padding:12px 14px;border-radius:12px;margin-bottom:16px;font-weight:600}.flash.ok{background:var(--gt);color:var(--gd)}.flash.error{background:#fef2f2;color:#b91c1c}.flash.warn{background:#fffbeb;color:#92400e}
ul.list{list-style:none;margin:0;padding:0}ul.list li{padding:12px 0;border-bottom:1px solid var(--line)}ul.list li:last-child{border:0}
.muted{color:var(--mut);font-size:12px;overflow-wrap:anywhere}.tiny{color:#a1a1aa;font-size:11px}
.cart{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}.chip{border:1px solid #ddd;background:#fff;border-radius:99px;padding:4px 12px;font-size:12px;cursor:pointer}
.seg{display:flex;gap:4px;border:1px solid #ddd;border-radius:10px;padding:4px}.seg label{flex:1;margin:0}.seg input{display:none}.seg span{display:block;text-align:center;padding:7px;border-radius:7px;font-size:12px;font-weight:700;color:var(--mut);cursor:pointer;text-transform:none;letter-spacing:0;margin:0}.seg input:checked+span{background:var(--g);color:#fff}
.preview{background:#f1f1f1;border-radius:14px;padding:12px}.pv{background:#fff;border-radius:12px;overflow:hidden}.pv img.big{width:100%;aspect-ratio:2/1;object-fit:cover;display:block}.pv .b{display:flex;gap:10px;padding:12px}.pv .ic{width:36px;height:36px;border-radius:8px;background:var(--g);flex-shrink:0}
.bar{height:6px;background:#eee;border-radius:9px;overflow:hidden;margin-top:6px}.bar i{display:block;height:100%;background:var(--g)}
.check{display:flex;gap:8px;align-items:flex-start;margin-bottom:10px}.check input{margin-top:3px}
</style></head><body><div class="wrap">';

    echo '<header><div><h1>Kafunda Marketing</h1><div class="sub">Push to the website &amp; app · offer emails · cart recovery</div></div>'
        . '<div><a class="btn btn-o" href="' . esc_url(admin_url()) . '">wp-admin</a> <a class="btn btn-o" href="' . esc_url(wp_logout_url(home_url('/'))) . '">Log out</a></div></header>';

    $tabs = ['overview' => 'Overview', 'push' => 'Push', 'email' => 'Email', 'carts' => 'Abandoned carts', 'settings' => 'Settings'];
    echo '<nav>';
    foreach ($tabs as $k => $label) {
        $badge = ($k === 'carts' && count($carts)) ? '<span class="badge">' . count($carts) . '</span>' : '';
        echo '<a class="' . ($tab === $k ? 'on' : '') . '" href="' . esc_url(kafunda_mkt_dash_url($k)) . '">' . $e($label) . $badge . '</a>';
    }
    echo '</nav>';

    if ($flash) echo '<div class="flash ' . $a($flash['type']) . '">' . $e($flash['text']) . '</div>';

    /* ---------------- Overview ---------------- */
    if ($tab === 'overview') {
        echo '<div class="grid g4" style="margin-bottom:16px">';
        $kpis = [
            ['Abandoned carts · 30d', $s['abandoned'], kafunda_mkt_ugx($s['open_value']) . ' still waiting'],
            ['Recovered · 30d', $s['recovered'], kafunda_mkt_ugx($s['recovered_value']) . ' won back'],
            ['Offer subscribers', $s['subscribers'], $s['aud_all'] . ' reachable by email'],
            ['Reminder emails · 30d', $s['reminders'], $s['converted'] . ' bought without one'],
        ];
        foreach ($kpis as $k) echo '<div class="card kpi"><div class="l">' . $e($k[0]) . '</div><div class="v">' . $e(number_format($k[1])) . '</div><div class="s">' . $e($k[2]) . '</div></div>';
        echo '</div><div class="grid g2">';

        $setup = [
            [!empty($o['from_email']), 'Sender email set', 'Settings → From email (use an address on kafundawines.com).'],
            [(bool) $pushReady, 'OneSignal connected', 'Settings → paste your OneSignal REST API key.'],
            [!empty($o['capture_checkout']), 'Capturing abandoned checkouts', 'Settings → turn on cart capture.'],
            [!empty($o['reminders_on']), 'Automatic cart reminder emails', 'Settings → turn on reminder emails.'],
        ];
        echo '<div class="card"><h2>Setup</h2><div class="in"><ul class="list">';
        foreach ($setup as $x) echo '<li>' . ($x[0] ? '✅ ' : '⚠️ ') . '<b>' . $e($x[1]) . '</b>' . ($x[0] ? '' : '<div class="muted">' . $e($x[2]) . '</div>') . '</li>';
        echo '</ul></div></div>';

        echo '<div class="card"><h2>Get more from your ads</h2><div class="in"><ul class="list">'
            . '<li><b>Push the offer the day an ad campaign starts</b> — people who already know you convert best. <a href="' . esc_url(kafunda_mkt_dash_url('push')) . '">Send push</a></li>'
            . '<li><b>Email past customers</b> — a repeat sale costs a fraction of a new click. <a href="' . esc_url(kafunda_mkt_dash_url('email')) . '">Send email</a></li>'
            . '<li><b>WhatsApp abandoned carts within the hour</b> — most just got distracted. <a href="' . esc_url(kafunda_mkt_dash_url('carts')) . '">Open carts</a></li>'
            . '</ul></div></div></div>';
    }

    /* ---------------- Push ---------------- */
    if ($tab === 'push') {
        if (!$pushReady) echo '<div class="flash warn">OneSignal isn\'t connected yet. Paste your REST API key in <a href="' . esc_url(kafunda_mkt_dash_url('settings')) . '">Settings</a> (OneSignal → Settings → Keys &amp; IDs).</div>';
        // ---- Automatic daily pushes card ----
        $auto = kafunda_mkt_auto_opts();
        if ($auto['on']) kafunda_mkt_auto_plan(); // top up the schedule whenever this page opens
        $alog = kafunda_mkt_auto_log();
        $tz = kafunda_mkt_tz();
        $fmt = function ($ts) use ($tz) { return (new DateTime('@' . (int) $ts))->setTimezone($tz)->format('D j M, H:i'); };
        $upcoming = array_filter($alog, function ($x) { return ($x['status'] ?? '') === 'scheduled' && ($x['at'] ?? 0) > time(); });
        $past = array_reverse(array_filter($alog, function ($x) { return ($x['status'] ?? '') !== 'scheduled' || ($x['at'] ?? 0) <= time(); }), true);
        $defaults = ['09:00', '12:00', '16:00', '20:00'];
        $rows = array_values(array_unique(array_merge($auto['slots'], $defaults)));
        sort($rows);

        echo '<div class="card" style="margin-bottom:16px"><h2>Automatic daily pushes ' . ($auto['on'] ? '<span style="color:var(--g)">● ON</span>' : '<span style="color:#a1a1aa">● OFF</span>') . '</h2><div class="in">'
            . '<p class="muted" style="margin-top:0">Each time below, a push goes out on its own with a random product, its photo, real price and a link to buy. Picks come from each drink\'s best sellers, a different drink each time, and carry the name of the running sale (Black November, Christmas Sale). Only products with a real sale price mention a saving. The wording fits the time of day. Products don\'t repeat until about 40 others have been featured.</p>'
            . '<form method="post">' . $nonce . '<input type="hidden" name="kmk_action" value="save_auto">'
            . '<div class="check"><input type="checkbox" id="aon" name="auto_on" value="1" ' . ($auto['on'] ? 'checked' : '') . '><label for="aon" style="margin:0"><b>Send automatic pushes every day</b> (Kampala time)</label></div>'
            . '<div style="display:flex;flex-wrap:wrap;gap:10px;margin:10px 0 14px">';
        foreach ($rows as $i => $time) {
            $on = in_array($time, $auto['slots'], true) || (!$auto['on'] && !get_option('kafunda_mkt_auto') && in_array($time, $defaults, true));
            echo '<div style="display:flex;gap:6px;align-items:center;border:1px solid #ddd;border-radius:10px;padding:6px 10px">'
                . '<input type="checkbox" name="slot_on[' . $i . ']" value="1" ' . ($on ? 'checked' : '') . '>'
                . '<input type="time" name="slot[' . $i . ']" value="' . $a($time) . '" style="border:0;font:inherit;font-weight:700"></div>';
        }
        echo '<div style="display:flex;gap:6px;align-items:center;border:1px dashed #ddd;border-radius:10px;padding:6px 10px"><input type="checkbox" name="slot_on[99]" value="1"><input type="time" name="slot[99]" style="border:0;font:inherit"><span class="tiny">extra</span></div>';
        echo '</div><div class="row2"><label><span>Send to</span><select name="auto_audience">'
            . '<option value="all"' . selected($auto['audience'], 'all', false) . '>Everyone — app + website</option>'
            . '<option value="app"' . selected($auto['audience'], 'app', false) . '>App only</option>'
            . '<option value="web"' . selected($auto['audience'], 'web', false) . '>Website only</option></select></label>'
            . '<label><span>Links open on</span><select name="auto_link">'
            . '<option value="shop"' . selected($auto['link'], 'shop', false) . '>shop.kafundawines.com</option>'
            . '<option value="wp"' . selected($auto['link'], 'wp', false) . '>kafundawines.com</option></select></label></div>'
            . '<label><span>Also email customers</span><select name="auto_email">'
            . '<option value="first"' . selected($auto['email'], 'first', false) . '>Once a day — with the first push (recommended)</option>'
            . '<option value="all"' . selected($auto['email'], 'all', false) . '>With every push</option>'
            . '<option value="off"' . selected($auto['email'], 'off', false) . '>No emails — push only</option></select>'
            . '<em class="hint">Goes to everyone who has ordered (' . (int) $s['aud_customers'] . ' emails, new customers added automatically) plus offer subscribers — ' . (int) $s['aud_all'] . ' people now; wrong addresses are skipped. More than one email a day gets you marked as spam quickly.</em></label>'
            . '<p class="tiny">Every push sells a product. Ugandan holidays and special days (Valentine\'s, Independence, Christmas…) keep their greeting and add a fitting bottle. Good Friday, Martyrs\' Day and Eid get one greeting only.<br>'
            . '<b>Today:</b> ' . $e(kafunda_mkt_plan_label(kafunda_mkt_day_plan(new DateTime('now', $tz)))) . '<br>'
            . '<b>Tomorrow:</b> ' . $e(kafunda_mkt_plan_label(kafunda_mkt_day_plan((new DateTime('now', $tz))->modify('+1 day')))) . '</p>'
            . '<button class="btn btn-g">Save automatic pushes</button></form>'
            . '<form method="post" style="margin-top:10px" onsubmit="return confirm(\'Send one automatic-style push to subscribers right now?\')">' . $nonce . '<input type="hidden" name="kmk_action" value="auto_sample"><button class="btn btn-o" style="width:100%" ' . ($pushReady ? '' : 'disabled') . '>Send a sample now</button></form>';

        if ($upcoming) {
            echo '<h3 style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;margin:18px 0 4px">Scheduled</h3><ul class="list">';
            foreach ($upcoming as $x) echo '<li><span class="tiny">' . $e($fmt($x['at'])) . (($x['email'] ?? '') === 'pending' ? ' · 🔔 push + ✉️ email' : ' · 🔔 push') . '</span><br><b>' . $e($x['title']) . '</b><div class="muted">' . $e($x['message']) . '</div></li>';
            echo '</ul>';
        }
        if ($past) {
            echo '<h3 style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;margin:18px 0 4px">Recently sent</h3><ul class="list">';
            foreach (array_slice($past, 0, 8, true) as $x) {
                echo '<li><span class="tiny">' . $e($fmt($x['at'] ?? time())) . ($x['status'] === 'error' ? ' · <b style="color:#b91c1c">failed: ' . $e($x['error']) . '</b>' : '') . (!empty($x['email']) ? ' · ✉️ ' . $e($x['email']) : '') . '</span><br><b>' . $e($x['title'] ?? '') . '</b></li>';
            }
            echo '</ul><p class="tiny">Delivery and click numbers for each one are in "Recent pushes" below.</p>';
        }
        echo '</div></div>';

        $default_url = home_url('/shop/');
        echo '<div class="grid g2"><div class="card"><h2>New push notification</h2><div class="in">'
            . '<div class="chips">'
            . '<button type="button" class="chip" data-t="🍾 Weekend deals are live!" data-m="Up to 20% off selected wines &amp; spirits. Delivered in 1–2 hours across Kampala.">Weekend offer</button>'
            . '<button type="button" class="chip" data-t="🚚 Free delivery today" data-m="Free delivery on orders over UGX 200,000. Stock up for the weekend!">Free delivery</button>'
            . '<button type="button" class="chip" data-t="✨ Just landed at Kafunda" data-m="New bottles on the shelf — be the first to try them.">New arrival</button>'
            . '</div>'
            . '<form method="post" onsubmit="return confirm(\'Send this push to your subscribers?\')">' . $nonce . '<input type="hidden" name="kmk_action" value="send_push">'
            . '<label><span>Title</span><input type="text" name="title" id="ptitle" maxlength="65" required placeholder="🍷 20% off all red wines today"></label>'
            . '<label><span>Message</span><textarea name="message" id="pmsg" rows="3" maxlength="240" required placeholder="Delivered in 1–2 hours across Kampala. Offer ends midnight."></textarea></label>'
            . '<label><span>Opens this link</span><input type="url" name="url" value="' . $a($default_url) . '"><em class="hint">A product, category or shop page. Tracking tags are added automatically.</em></label>'
            . '<label><span>Image (optional)</span><input type="url" name="image" id="pimg" placeholder="https://kafundawines.com/wp-content/uploads/…jpg"><em class="hint">Wide image (2:1). Copy the link from Media → Library.</em></label>'
            . '<div class="row2"><div><label style="margin-bottom:5px"><span>Send to</span></label><div class="seg">'
            . '<label><input type="radio" name="audience" value="all" checked><span>Everyone</span></label>'
            . '<label><input type="radio" name="audience" value="web"><span>Website</span></label>'
            . '<label><input type="radio" name="audience" value="app"><span>App</span></label></div></div>'
            . '<label><span>Schedule (optional)</span><input type="datetime-local" name="when"><em class="hint">Kampala time. Empty = send now.</em></label></div>'
            . '<button class="btn btn-g" ' . ($pushReady ? '' : 'disabled') . '>Send push</button></form></div></div>';

        echo '<div><div class="card" style="margin-bottom:16px"><h2>Preview</h2><div class="in"><div class="preview"><div class="pv"><img class="big" id="pvimg" alt="" style="display:none"><div class="b"><div class="ic"></div><div style="min-width:0"><b id="pvt">Notification title</b><div class="muted" id="pvm">Your message appears here.</div><div class="tiny">kafundawines.com</div></div></div></div></div></div></div>';

        echo '<div class="card"><h2>Recent pushes</h2><div class="in">';
        if ($pushReady) {
            $h = kafunda_mkt_onesignal('GET', 'notifications?app_id=' . rawurlencode($o['onesignal_app_id']) . '&limit=12&kind=0');
            if (is_wp_error($h)) echo '<div class="flash error">' . $e($h->get_error_message()) . '</div>';
            elseif (empty($h['notifications'])) echo '<p class="muted">Nothing sent yet.</p>';
            else {
                echo '<ul class="list">';
                foreach ($h['notifications'] as $n) {
                    $ok = (int) ($n['successful'] ?? 0); $clk = (int) ($n['converted'] ?? 0);
                    $when = !empty($n['completed_at']) ? human_time_diff((int) $n['completed_at']) . ' ago' : (!empty($n['canceled']) ? 'cancelled' : 'scheduled / sending');
                    echo '<li><b>' . $e($n['headings']['en'] ?? '') . '</b><div class="muted">' . $e($n['contents']['en'] ?? '') . '</div>'
                        . '<div class="tiny">' . $e($when) . ' · <b>' . $ok . '</b> delivered · <b>' . $clk . '</b> clicks' . ($ok ? ' (' . round($clk / $ok * 100, 1) . '%)' : '') . '</div></li>';
                }
                echo '</ul>';
            }
        } else echo '<p class="muted">Connect OneSignal to see history.</p>';
        echo '</div></div></div></div>';

        echo "<script>(function(){var t=document.getElementById('ptitle'),m=document.getElementById('pmsg'),i=document.getElementById('pimg'),pi=document.getElementById('pvimg');"
            . "function u(){document.getElementById('pvt').textContent=t.value||'Notification title';document.getElementById('pvm').textContent=m.value||'Your message appears here.';"
            . "if(i.value){pi.src=i.value;pi.style.display='block';}else{pi.style.display='none';}}"
            . "[t,m,i].forEach(function(x){x.addEventListener('input',u);});"
            . "document.querySelectorAll('.chip').forEach(function(c){c.addEventListener('click',function(){t.value=c.dataset.t;m.value=c.dataset.m;u();});});})();</script>";
    }

    /* ---------------- Email ---------------- */
    if ($tab === 'email') {
        $d = get_transient('kafunda_mkt_draft_' . get_current_user_id()) ?: [];
        $dv = function ($k, $def = '') use ($d) { return esc_attr($d[$k] ?? $def); };
        $aud = $d['audience'] ?? 'all';
        echo '<div class="grid g2"><div class="card"><h2>New offer email</h2><div class="in">'
            . '<form method="post" id="ef">' . $nonce . '<input type="hidden" name="kmk_action" value="send_email"><input type="hidden" name="mode" id="emode" value="send">'
            . '<label><span>Subject line</span><input type="text" name="subject" maxlength="120" required value="' . $dv('subject') . '" placeholder="This weekend only: 20% off whisky 🥃"></label>'
            . '<label><span>Preview text (optional)</span><input type="text" name="preheader" value="' . $dv('preheader') . '" placeholder="Delivered in 1–2 hours across Kampala"><em class="hint">Shown next to the subject in the inbox.</em></label>'
            . '<label><span>Heading</span><input type="text" name="heading" required value="' . $dv('heading') . '" placeholder="Weekend Whisky Sale"></label>'
            . '<label><span>Message</span><textarea name="body" rows="7" required placeholder="Hi there,&#10;&#10;This weekend every whisky is 20% off…">' . esc_textarea($d['body'] ?? '') . '</textarea><em class="hint">Plain text. Leave an empty line between paragraphs.</em></label>'
            . '<label><span>Banner image (optional)</span><input type="url" name="image_url" value="' . $dv('image_url') . '" placeholder="https://kafundawines.com/wp-content/uploads/…jpg"><em class="hint">Ideally 1200×600. Copy from Media → Library.</em></label>'
            . '<div class="row2"><label><span>Button text</span><input type="text" name="cta_text" value="' . $dv('cta_text', 'Shop the offer') . '"></label>'
            . '<label><span>Button link</span><input type="url" name="cta_url" value="' . $dv('cta_url', home_url('/shop/')) . '"></label></div>'
            . '<label><span>Send to</span><select name="audience" id="eaud">'
            . '<option value="all" data-n="' . $s['aud_all'] . '"' . selected($aud, 'all', false) . '>Everyone — subscribers + past customers (' . $s['aud_all'] . ')</option>'
            . '<option value="subscribers" data-n="' . $s['aud_subscribers'] . '"' . selected($aud, 'subscribers', false) . '>Offer subscribers only (' . $s['aud_subscribers'] . ')</option>'
            . '<option value="customers" data-n="' . $s['aud_customers'] . '"' . selected($aud, 'customers', false) . '>Past customers only (' . $s['aud_customers'] . ')</option>'
            . '</select><em class="hint">Unsubscribed and wrong addresses are skipped automatically.</em></label>'
            . '<div class="row2" style="background:#fafafa;padding:10px;border-radius:12px;margin-bottom:12px"><input type="email" name="test_email" value="' . $dv('test_email', wp_get_current_user()->user_email) . '" placeholder="you@example.com">'
            . '<button class="btn btn-o" type="submit" onclick="document.getElementById(\'emode\').value=\'test\'">Send test to me</button></div>'
            . '<button class="btn btn-g" type="submit" onclick="document.getElementById(\'emode\').value=\'send\';var o=document.getElementById(\'eaud\').selectedOptions[0];return confirm(\'Send this email to \'+o.dataset.n+\' people? This cannot be undone.\')">Send to everyone selected</button>'
            . '</form></div></div>';

        $export = add_query_arg(['export' => 'contacts', '_kmk' => wp_create_nonce('kafunda_mkt_export')], kafunda_mkt_dash_url('email'));
        echo '<div><div class="card" style="margin-bottom:16px"><h2>Customers from all orders</h2><div class="in">'
            . '<p class="muted" style="margin-top:0">Every customer in your WooCommerce orders — website, shop and app, old and new. <b>' . (int) $s['aud_customers'] . '</b> have an email and get offer emails automatically (new customers are added the moment they order). Many only gave a phone number — the export includes them too, for WhatsApp broadcasts.</p>'
            . '<a class="btn btn-o" style="width:100%" href="' . esc_url($export) . '">Download customer list (CSV)</a>'
            . '<p class="tiny" style="margin-bottom:0">Name, email, phone, paid orders, total spent, last order, email status. Opens in Excel or Google Sheets.</p></div></div>';

        $bad = kafunda_mkt_bad_emails();
        echo '<div class="card" style="margin-bottom:16px"><h2>Wrong emails — skipped (' . count($s['skipped']) . ')</h2><div class="in">'
            . '<p class="muted" style="margin-top:0">Never emailed: typos (gmial.com, gmail.con…), fake or placeholder addresses, domains that don\'t exist, and addresses the mail server refused.</p>';
        if ($s['skipped']) {
            echo '<ul class="list" style="max-height:260px;overflow:auto">';
            foreach (array_slice($s['skipped'], 0, 200, true) as $em => $why) {
                echo '<li><b>' . $e($em) . '</b> <span class="tiny">· ' . $e($why) . '</span>'
                    . (!empty($bad[$em]['blocked']) ? '<form method="post" style="display:inline">' . $nonce . '<input type="hidden" name="kmk_action" value="unblock_email"><input type="hidden" name="email" value="' . $a($em) . '"> <button class="btn btn-o" style="padding:2px 10px;font-size:11px">Allow</button></form>' : '')
                    . '</li>';
            }
            echo '</ul>';
        }
        echo '<form method="post">' . $nonce . '<input type="hidden" name="kmk_action" value="block_emails">'
            . '<label><span>Never email these</span><textarea name="emails" rows="2" placeholder="wrong@address.com, another@one.com"></textarea></label>'
            . '<button class="btn btn-o" style="width:100%">Block</button></form></div></div>';

        $camps = $wpdb->get_results("SELECT id, subject, audience, status, total, sent, failed, created_at FROM {$t['campaigns']} ORDER BY id DESC LIMIT 20");
        $sending = false;
        echo '<div class="card"><h2>Campaigns</h2><div class="in">';
        if (!$camps) echo '<p class="muted">No campaigns yet. Send yourself a test first.</p>';
        echo '<ul class="list">';
        foreach ($camps as $c) {
            $active = in_array($c->status, ['queued', 'sending'], true);
            $sending = $sending || $active;
            $pct = $c->total ? round(($c->sent + $c->failed) / $c->total * 100) : 0;
            echo '<li><div style="display:flex;justify-content:space-between;gap:8px"><b>' . $e($c->subject) . '</b>'
                . ($active ? '<form method="post" onsubmit="return confirm(\'Stop this campaign?\')">' . $nonce . '<input type="hidden" name="kmk_action" value="cancel_campaign"><input type="hidden" name="id" value="' . (int) $c->id . '"><button class="btn btn-x">Stop</button></form>' : '')
                . '</div><div class="tiny">' . $e($ago($c->created_at)) . ' · ' . $e($c->audience) . ' · ' . $e($c->status) . ' · ' . (int) $c->sent . '/' . (int) $c->total . ' sent' . ($c->failed ? ', ' . (int) $c->failed . ' failed' : '') . '</div>'
                . ($active ? '<div class="bar"><i style="width:' . $pct . '%"></i></div>' : '') . '</li>';
        }
        echo '</ul></div></div></div></div>';

        if ($sending) {
            // Keep the queue moving while this page is open (wp-cron only runs when the site gets visits).
            $ajax = esc_url(admin_url('admin-ajax.php?action=kafunda_mkt_tick'));
            echo "<script>setTimeout(function(){fetch('{$ajax}',{credentials:'same-origin'}).finally(function(){location.reload();});},15000);</script>";
        }
    }

    /* ---------------- Carts ---------------- */
    if ($tab === 'carts') {
        echo '<div class="card"><h2>Abandoned checkouts (' . count($carts) . ')</h2><div class="in">'
            . '<p class="muted">People who typed their phone or email at checkout but didn\'t order. Those with an email get automatic reminders after 1 hour and 24 hours. Message the rest on WhatsApp — the link puts their cart back in one tap.</p>';
        if (!$carts) echo '<p class="muted" style="text-align:center;padding:30px 0">No abandoned carts right now. 🎉</p>';
        echo '<ul class="list">';
        foreach ($carts as $c) {
            $items = json_decode($c->items, true) ?: [];
            $names = implode(', ', array_map(function ($i) { return ($i['quantity'] ?? 1) . '× ' . ($i['name'] ?? ''); }, $items));
            $first = trim(explode(' ', (string) $c->name)[0] ?? '') ?: 'there';
            $short = implode(', ', array_slice(array_map(function ($i) { return $i['name'] ?? ''; }, $items), 0, 3)) . (count($items) > 3 ? ' and more' : '');
            $link = kafunda_mkt_restore_url($c->token, 'whatsapp', 'abandoned_cart');
            $msg = "Hi $first, this is Kafunda Wines & Spirits 🍷. You left $short in your cart. Can we help you finish your order? We deliver in 1–2 hours. Tap here to complete it: $link";
            echo '<li class="cart"><div style="min-width:0;flex:1"><b>' . $e($c->name ?: 'No name') . '</b> <b style="color:var(--g)">' . $e(kafunda_mkt_ugx($c->subtotal)) . '</b>'
                . '<div class="muted">' . $e($names) . '</div>'
                . '<div class="tiny">' . $e($ago($c->updated_at)) . ($c->phone ? ' · 0' . $e($c->phone) : '') . ($c->email ? ' · ' . $e($c->email) . ' · ' . (int) $c->reminders . '/2 reminder emails' : ' · no email — WhatsApp only') . ' · ' . ($c->source === 'shop' ? 'shop.kafundawines.com' : 'kafundawines.com') . '</div></div>'
                . '<div style="display:flex;gap:6px;align-items:center">'
                . ($c->phone ? '<a class="btn btn-w" target="_blank" rel="noopener" href="' . esc_url('https://wa.me/256' . $c->phone . '?text=' . rawurlencode($msg)) . '">WhatsApp</a><a class="btn btn-o" href="tel:+256' . $a($c->phone) . '">Call</a>' : '')
                . '<form method="post">' . $nonce . '<input type="hidden" name="kmk_action" value="dismiss_cart"><input type="hidden" name="id" value="' . (int) $c->id . '"><button class="btn btn-x" title="Dismiss">✕</button></form>'
                . '</div></li>';
        }
        echo '</ul></div></div>';
    }

    /* ---------------- Settings ---------------- */
    if ($tab === 'settings') {
        $masked = $o['onesignal_rest_key'] ? substr($o['onesignal_rest_key'], 0, 8) . str_repeat('•', 12) : '';
        $chk = function ($k) use ($o) { return !empty($o[$k]) ? 'checked' : ''; };
        echo '<div class="grid g2"><div class="card"><h2>Settings</h2><div class="in"><form method="post">' . $nonce . '<input type="hidden" name="kmk_action" value="save_settings">'
            . '<label><span>From name</span><input type="text" name="from_name" value="' . $a($o['from_name']) . '"></label>'
            . '<label><span>From email</span><input type="email" name="from_email" value="' . $a($o['from_email']) . '" placeholder="offers@kafundawines.com"><em class="hint">Use an address on kafundawines.com so emails don\'t land in spam. Blank = your SMTP plugin\'s sender.</em></label>'
            . '<label><span>WhatsApp number</span><input type="text" name="whatsapp" value="' . $a($o['whatsapp']) . '"></label>'
            . '<label><span>OneSignal App ID</span><input type="text" name="onesignal_app_id" value="' . $a($o['onesignal_app_id']) . '"></label>'
            . '<label><span>OneSignal REST API key</span><input type="password" name="onesignal_rest_key" value="' . $a($masked) . '" placeholder="os_v2_app_…" autocomplete="off"><em class="hint">OneSignal → Settings → Keys &amp; IDs → Add key. Stored in WordPress only; leave as is to keep the saved key.</em></label>'
            . '<div class="check"><input type="checkbox" id="c1" name="capture_checkout" value="1" ' . $chk('capture_checkout') . '><label for="c1" style="margin:0">Save carts when a customer types their phone/email at checkout</label></div>'
            . '<div class="check"><input type="checkbox" id="c2" name="reminders_on" value="1" ' . $chk('reminders_on') . '><label for="c2" style="margin:0">Send cart reminder emails after 1 hour and 24 hours</label></div>'
            . '<div class="check"><input type="checkbox" id="c3" name="push_on_site" value="1" ' . $chk('push_on_site') . '><label for="c3" style="margin:0">Ask kafundawines.com visitors to allow push notifications <span class="tiny">(OneSignal → Settings → Web → Site URL must be https://kafundawines.com)</span></label></div>'
            . '<label style="margin-top:14px"><span>Shop URL</span><input type="url" name="shop_url" value="' . $a($o['shop_url']) . '"><em class="hint">Where "Complete my order" links send carts started on the separate shop site.</em></label>'
            . '<button class="btn btn-g">Save settings</button></form></div></div>';

        echo '<div class="card"><h2>Test email delivery</h2><div class="in"><form method="post">' . $nonce . '<input type="hidden" name="kmk_action" value="test_settings">'
            . '<label><span>Send a test to</span><input type="email" name="test_to" value="' . $a(wp_get_current_user()->user_email) . '"></label>'
            . '<button class="btn btn-o" style="width:100%">Send test email</button></form>'
            . '<p class="muted" style="margin-top:14px">If the test doesn\'t arrive, install <b>WP Mail SMTP</b> and connect it to your email provider — WordPress\' built-in mail often lands in spam.</p>'
            . '<p class="muted">If you also use another abandoned-cart plugin (e.g. "Cart reminders"), turn one of them off so customers don\'t get two reminders.</p>'
            . '</div></div></div>';
    }

    echo '</div></body></html>';
}

} // end KAFUNDA_MKT_LOADED guard
