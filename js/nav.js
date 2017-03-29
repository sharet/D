"use strict";

var nav = nav || (function() {

    function render(template, params, root) {
        var e = document.getElementById("t-" + template);
        if (!e) throw "no such template: " + template;

        if (!root) {
            root = document.getElementsByClassName("main")[0]
        }

        var fullParams = Object.assign({
            "attr-escape": function () {
                return function (text, render) {
                    return render(text.replace(/(['"])/g, '\\$1'));
                }
            }
        }, params);

        root.innerHTML = Mustache.render(e.innerHTML, fullParams)
    }

    function go(url, opt) {
        opt = opt || {};
        catchErrors(() => {
            if (!auth.isLoggedIn()) {
                render('login');
                return;
            }

            return ensureIndexLoaded().then(() => {
                return route(url)
            }).then(() => {
                if (!opt.nohistory)
                    window.history.pushState(url, null, null);
            })
        });
    }

    function route(url) {
        if (url == '/') {
            return index.indexPage();
        }
        if (url == '/new') {
            return entry.newEntry();
        }

        if (url.indexOf('/edit/') == 0) {
            var n1 = parseInt(url.substring('/edit/'.length));
            return entry.editEntry(n1);
        }

        if (url.indexOf('/view/') == 0) {

            var n2 = parseInt(url.substring('/edit/'.length));
            if (n2 < 0 || n2 >= main.index().length) {
                render('error', {
                    title: 'Not found',
                    errors: ['Entry not found: ' + n2]
                });
                Promise.resolve();
            }
            return view.view(n2);
        }
        alert('404: ' + url);
        return Promise.resolve();
    }

    function catchErrors(f) {
        try {
            var r = f();
            if (r && r.catch) {
                return r.catch(e => {
                    console.log(e);
                    alert(e);
                })
            } else {
                return r;
            }
        } catch (e) {
            console.log(e);
            alert(e);
        }
    }

    function ensureIndexLoaded() {
        if (!main.index()) {
            nav.render("load-index", {count: 0});

            return main.loadIndex(n => nav.render("load-index", {count: n}))
                .catch(function (e) {
                    console.log(e);
                    alert(e);
                });
        }
        return Promise.resolve();
    }

    window.onpopstate = function(e){
        if (e.state) {
            go(e.state, {nohistory: true});
        }
    };

    return {
        render: render,
        go: go
    }
})();