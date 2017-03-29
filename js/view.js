var view = view || (function() {

    function view_(n) {
        var index = main.index()[n];

        return davget(auth.entryUrl(n)).then(body => {
            var date;

            if (index.created == index.updated) {
                date = formatDate(index.created)
            } else {
                date = formatDate(index.created) + ", upd. " + formatDate(index.updated);
            }

            nav.render('view', {
                title: index.title,
                date: date,
                n: index.n,
                tags: index.tags,
                content: auth.decrypt(body)
            });
        });
    }
    return {
        view: view_
    }
})();