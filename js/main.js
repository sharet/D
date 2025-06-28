var main = main || (function() {
    var index = false;
    var logoutAt = 0;

    /**
     * Load diary index
     * @param loadCallback (numberOfEntriesLoaded) => unit
     * @return Promise<index[]>
     */
    function loadIndex(loadCallback) {
        var result = [];
        var loaded = 0;
        var foundEnd = false;
        var i = 0;
        return runParallel(() => {
            const n = i++;
            if (foundEnd) return false;

            return davgetRaw(auth.entryIndexUrl(n)).then(textAndStatus => {
                const data = textAndStatus.text;
                const status = textAndStatus.status;

                if (status === 404) {
                    foundEnd = true;
                } else if (status >= 300) {
                    throw new Error('' + status);
                } else {
                    var r = JSON.parse(auth.decrypt(data));
                    r.n = n;

                    while (n >= result.length) {
                        result.push(undefined);
                    }
                    result[n] = r;
                    loaded += 1;
                    if (loadCallback)
                        loadCallback(loaded);
                }

            }, () => {
                //reached end of index
                foundEnd = true;
            });
        }, 10).then(() => {
            index = result;
            index.sort((a, b) => a.timestamp < b.timestamp);
            return index;
        });
    }

    function writeEntry(ix, body, n) {
        userAction();
        if (n > index.length || n < 0) {
            return Promise.reject(new Error("Attempting to write entry #" + n + " but next available is " + index.length))
        }

        ix = Object.assign({}, ix);
        delete ix.n;

        if (n < index.length) {
            ix.updated = new Date().getTime();
            ix.created = index[n].created
        } else {
            ix.created = new Date().getTime();
            ix.updated = ix.created;
        }

        return davput(auth.entryUrl(n), auth.encrypt(body)).then(() => {
            return davput(auth.entryIndexUrl(n), auth.encrypt(JSON.stringify(ix)));
        }).then(() => {
            ix.n = n;
            if (n == index.length) {
                index.push(ix)
            } else {
                index[n] = ix;
            }
        });
    }

    function deleteEntry(n) {
        userAction();
        if (n >= index.length || n < 0 || isNaN(n) || typeof n != "number") {
            alert("Attempting to delete entry #" + n + " but max available is " + (index.length - 1));
            return;
        }

        if (index[n].deleted) {
            alert("entry #" + n + " is already deleted");
            return;
        }

        if (confirm("Do you really want to delete:\n" + index[n].title)) {
            var ix = Object.assign({}, index[n]);
            ix.deleted = true;
            writeEntry(ix, "", n).then(r => nav.go('/')).catch(e => {
                console.log(e);
                alert(e);
            })
        }

    }

    function getKnownTags() {
        var r = {};
        index.forEach(e => {
            e.tags.forEach(t => {
                r[t] = 1;
            })
        });

        var tags = Object.keys(r);
        tags.sort();
        return tags;
    }

    function login() {
        var base = document.getElementsByClassName('login__base')[0].value;
        var code = document.getElementsByClassName('login__code')[0].value;
        var loginFormElements = ['login__submit', 'login__code', 'login__base'].map(cl =>
            document.getElementsByClassName(cl)[0]);


        if (base.indexOf("http:") != 0) {
            base = "https://" + base;
        }

        loginFormElements.forEach(e => e.disabled = true);

        //async so user sees disabled buttons
        setTimeout(() => {
            auth.login(base, code);

            validateSetup().then((errors) =>{
                if (errors.length != 0) {
                    nav.render("error", {
                        title: "Application is not set up correctly",
                        errors: errors
                    });
                    return;
                }
                return validateLogin().then(errors => {
                    if (errors.length != 0) {
                        nav.render("error", {
                            title: "Authentication failed",
                            errors: errors
                        });
                        return;
                    }
                    document.getElementsByClassName('toolbar')[0].style.display = 'block';
                    loginFormElements.forEach(e => e.disabled = false);
                    logoutAt = new Date().getTime() + 1000 * 60 * 10;
                    return nav.go('/');
                });
            }).catch(wtf => {
                loginFormElements.forEach(e => e.disabled = false);
                console.log(wtf);
                alert(wtf);
            });
        }, 1);

    }

    function logout() {
        document.getElementsByClassName('toolbar')[0].style.display = 'none';
        auth.logout();
        index = false;
        nav.go('/');
    }

    /**
     *
     * @returns Promise<array<string>> - list of errors found
     */
    function validateSetup() {
        //ensure dav is working properly

        var put1 = davput("test", "test").then(function () {
            return ["Put to ./ succeed. Check your permissions!"];
        }).catch(e => []);

        var put2 = davput("data/test", "test").then(function () {
            return ["Put to ./data succeed. Check your permissions!"];
        }).catch(e => []);

        return Promise.all([put1, put2]).then(errors => c.flatMap(errors, i => i));
    }

    /**
     * @returns Promise<array<string>> - list of errors found
     */

    function validateLogin() {
        var random = "test-" + Math.random();
        var root = auth.getRoot();

        return davput(root + "/test", random)
            .then(r => davget(root + "/test", random))
            .then(result => {
                if (result == random) return [];
                return ["WebDAV is accessible but returned file content do not match, expected one was '" + random + "'"]
            })
            .catch(e => ["'" + root + "' is not accessible as WebDAV endpoint.\n " +
            "Possible reasons: invalid authentication, this user is not yet configured on server.\n " +
            "Ensure that folder exists and have correct access rights. Underlying error: \n" + e]);
    }

    function reloadIndex() {
        userAction();
        index = false;
        nav.go('/');
    }

    function userAction() {
        logoutAt = new Date().getTime() + 1000 * 60 * 10;
    }

    function logoutInMin() {
        if (logoutAt === 0) return Infinity;
        return Math.floor((logoutAt - new Date().getTime() + 60 * 1000 - 1) / 1000 / 60);
    }

    function logoutTimerTick() {
        let uiElem = document.getElementsByClassName('toolbar__logout_min')[0];
        if (uiElem) {
            uiElem.innerHTML = '' + logoutInMin();
        }
        if (logoutInMin() <= 0) {
            logout();
            logoutAt = 0;
        }
        setTimeout(logoutTimerTick, 1000);
    }

    logoutTimerTick();

    return {
        index: function() {
            return index;
        },
        loadIndex: loadIndex,
        writeEntry: writeEntry,
        deleteEntry: deleteEntry,
        getKnownTags: getKnownTags,
        login: login,
        logout: logout,
        reloadIndex: reloadIndex,
        userAction: userAction,
        logoutInMin: logoutInMin
    }
})();
