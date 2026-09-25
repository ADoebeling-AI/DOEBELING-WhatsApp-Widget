<?php
/**
 * Step 2: the site owner confirms the link from the e-mail.
 *
 * GET only shows a button, so link scanners in mail systems can't confirm by
 * accident. POST creates the site key, mails it with the ready-made snippet
 * and sends the owner back to the configurator.
 */

declare(strict_types=1);

const WAW_SERVICE = true;
require __DIR__ . '/lib.php';

$config = waw_config();
$method = waw_method('GET', 'POST');
$token = waw_input('t', 8000);
$request = waw_unseal('verify', $token);

if ($request === null || ($request['x'] ?? 0) < time()) {
    waw_page('Link expired', '<p>This confirmation link is invalid or older than 24 hours. Please request a new one in the configurator.</p>', 410);
}

$domains = implode(', ', $request['d']);

if ($method === 'GET') {
    waw_page('Confirm e-mail notifications', sprintf(
        '<p>Messages from the WhatsApp widget on <strong>%s</strong> will be sent to <strong>%s</strong>.</p>'
        . '<p class="muted">By confirming, you accept the <a href="%s">data processing agreement</a> (version %s).</p>'
        . '<form method="post"><input type="hidden" name="t" value="%s"><button type="submit">Confirm</button></form>',
        waw_html($domains),
        waw_html($request['e']),
        waw_html($config['dpa_url']),
        waw_html($config['dpa_version']),
        waw_html($token)
    ));
}

if (!waw_once('verify|' . $token, 2 * 86400)) {
    waw_page('Already confirmed', '<p>This link has already been used. Your site key is in the e-mail we sent after the confirmation.</p>', 409);
}

$keyId = bin2hex(random_bytes(8));
$siteKey = waw_seal('key', [
    'i' => $keyId,
    'e' => $request['e'],
    'd' => $request['d'],
    'l' => $request['l'],
    'a' => time(),               // time of confirmation
    'p' => $config['dpa_version'], // accepted version of the data processing agreement
]);
$revokeLink = $config['base_url'] . '/api/revoke.php?t=' . waw_seal('revoke', ['i' => $keyId, 'd' => $request['d']]);

waw_mail($request['e'], waw_text($request['l'], 'key_subject'), waw_text($request['l'], 'key_body', [
    'domains' => $domains,
    'snippet' => waw_snippet($request['o'], $siteKey),
    'revoke' => $revokeLink,
]));

$setup = waw_b64u_encode(json_encode(['k' => $siteKey, 'o' => (object) $request['o']], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
header('Location: ' . $config['base_url'] . '/#setup=' . $setup, true, 303);
exit;
