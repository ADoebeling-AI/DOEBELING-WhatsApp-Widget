<?php
/**
 * Stops the notifications of a site key. The link is in every notification.
 * GET only shows a button, so link scanners can't revoke by accident.
 */

declare(strict_types=1);

const WAW_SERVICE = true;
require __DIR__ . '/lib.php';

waw_config();
$method = waw_method('GET', 'POST');
$token = waw_input('t', 1000);
$revoke = waw_unseal('revoke', $token);

if ($revoke === null) {
    waw_page('Invalid link', '<p>This link is invalid.</p>', 400);
}

$domains = waw_html(implode(', ', $revoke['d']));

if ($method === 'GET') {
    waw_page('Stop e-mail notifications', sprintf(
        '<p>After this step, messages from the WhatsApp widget on <strong>%s</strong> are no longer sent by e-mail. '
        . 'The widget itself keeps working. You can request a new site key in the configurator at any time.</p>'
        . '<form method="post"><input type="hidden" name="t" value="%s"><button type="submit">Stop notifications</button></form>',
        $domains,
        waw_html($token)
    ));
}

waw_revoke($revoke['i']);
waw_page('Notifications stopped', "<p>E-mail notifications for <strong>{$domains}</strong> are switched off.</p>");
