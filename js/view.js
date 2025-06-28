var view = view || (function() {

    function view_(n) {
        main.userAction();
        var index = main.index()[n];

        return davget(auth.entryUrl(n)).then(body => {
            var date;

            if (index.created === index.updated) {
                date = formatDate(index.created)
            } else {
                date = formatDate(index.created) + ", upd. " + formatDate(index.updated);
            }
            let content = auth.decrypt(body);
            if (content.split('<br>').length > 3) {
                // legacy HTML
                content = content
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/<br>\n/g, "  \n")
                    .replace(/<br>/g, "  \n")
            }

            nav.render('view', {
                title: index.title,
                date: date,
                n: index.n,
                tags: index.tags,
                content: marked.parse(content)
            });
        });
    }
    return {
        view: view_
    }
})();