"use strict";

var auth = auth || (function() {
    var root;
    var key;
    var stableKey;
    var nosalt = CryptoJS.enc.Hex.parse('');

    function entryUrl(n) {
        return root + "/" + stableEncrypt("entry-" + n);
    }

    function entryIndexUrl(n) {
        return root + "/" + stableEncrypt("entry-" + n) + "-index";
    }

    function encrypt(txt) {
        return CryptoJS.AES.encrypt(txt, key).toString();
    }

    function decrypt(txt) {
        var r = CryptoJS.AES.decrypt(txt, key).toString(CryptoJS.enc.Utf8);

        return r;
    }

    function stableEncrypt(txt) {
        return CryptoJS.AES.encrypt(txt, stableKey, {
            iv: nosalt,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        }).ciphertext.toString();
    }

    function login(base, k) {
        var bc = dcodeIO.bcrypt.hashSync(k, '$2a$12$.12345678901234512345.');
        key = CryptoJS.SHA512(bc).toString(CryptoJS.enc.Hex);
        stableKey = CryptoJS.PBKDF2(key, nosalt, { keySize: 256/32 });

        if (base.lastIndexOf('/') != base.length - 1) {
            base = base + "/";
        }
        root = base + stableEncrypt("root");
    }

    function logout() {
        root = undefined;
        key = undefined;
        stableKey = undefined;
    }

    function isLoggedIn() {
        return !!key;
    }

    return {
        getRoot: () => root,
        entryUrl: entryUrl,
        entryIndexUrl: entryIndexUrl,
        encrypt: encrypt,
        decrypt: decrypt,
        login: login,
        logout: logout,
        isLoggedIn: isLoggedIn
    }
}());