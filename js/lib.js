"use strict";

/**
 * plain ajax request with string or json payload
 *
 * @param url url
 * @param method http method
 * @param [data] string or json request body
 * @returns {Promise<{text: string, status: number}>} return response body or fails with string or Error
 */
function httpplain(url, method, data) {
    var r = new XMLHttpRequest();

    return new Promise(function(resolve, reject) {

        r.onreadystatechange = function() {
            if (r.readyState === 4) {
                if (r.status > 0) {
                    resolve({
                        text: r.responseText,
                        status: r.status
                    });
                } else { // e.g sleep
                    reject(r.responseText);
                }
            }
        };

        try {
            r.open(method, url, true);
        } catch(e) {
            reject(e)
        }
        r.setRequestHeader("Content-Type", "text/plain");
        r.send((typeof(data) != 'string') ? JSON.stringify(data) : data);
    })
}

/**
 *
 * @param url
 * @returns {Promise<string>}
 */
function davget(url) {
    return httpplain(url, 'GET').then(textAndStatus => {
        if (textAndStatus.status >= 300)
            throw new Error('' + textAndStatus.status);
        else
            return textAndStatus.text;
    })
}

/**
 *
 * @param url
 * @returns {Promise<{text: string, status: number}>}
 */
function davgetRaw(url) {
    return httpplain(url, 'GET');
}

/**
 *
 * @param url
 * @param data string or js object (serialized as json)
 * @returns {Promise<void>}
 */
function davput(url, data) {
    return httpplain(url, 'PUT', data).then(textAndStatus => {
        if (textAndStatus.status >= 300)
            throw new Error('' + textAndStatus.status);

    })
}

function formatDate(ts) {
    var d = new Date(ts);

    function zeropad(n) {
        return n < 10 ? '0' + n : '' + n;
    }


    var date = zeropad(d.getDate()) + "." + zeropad(d.getMonth() + 1) + "." + d.getFullYear();
    var time = zeropad(d.getHours() + 1) + ":" + zeropad(d.getMinutes());

    return date + " " + time;
}

/**
 * Run jobs in parallel.
 * @param runJob () -> Promise | false: function that starts job or returns false if no more jobs
 * @param n level of parallelism to use
 * @returns Promise<Array<V>>
 */
function runParallel(runJob, n) {
    return new Promise((resolve, reject) => {
        if (n <= 0) {
            reject("n <= 0");
            return;
        }

        var running = 0;
        var finish = false;
        var result = [];
        var errors = [];

        function loop() {

            while (running < n && !finish) {
                var p;
                try {
                    p = runJob();
                } catch (e) {
                    p = Promise.reject(e);
                }
                running += 1;

                if (p) {
                    const ix = result.length;
                    result.push(null);
                    p.then(r => {
                        result[ix] = r;
                    }).catch(e => {
                        errors.push({ix: ix, error: e});
                    }).finally(() => {
                        running -= 1;
                        if (finish && running === 0) {
                            if (errors.length > 0) reject(errors); else resolve(result);
                        }
                        loop();
                    });
                } else {
                    running -= 1;
                    finish = true;
                    if (running === 0) {
                        if (errors.length > 0) reject(errors); else resolve(result);
                    }
                }
            }
        }

        loop();
    });
}

//collections support
var c = c || {};
c.isFunction = function isFunction(obj) {
    var getType = {};
    return obj && getType.toString.call(obj) === '[object Function]';
};

/**
 * map. supports:
 *
 * arrays, (e) -> e
 * objects, (k, v) -> [k1, v1]
 *
 * @param obj
 * @param func
 * @returns {*}
 */
c.map = function(obj, func) {
    if (Array.isArray(obj)) {
        return c.flatMap(obj, function(e) {
            return [func(e)];
        });
    }

    //object
    return c.flatMap(obj, function (k, v) {
        var e = func(k, v);
        var r = {};
        r[e[0]] = r[e[1]];
        return r;
    });
};

/**
 * flatMap. supports:
 * arrays, (e) -> array<e>
 * objects, (k, v) -> {}
 *
 * @param obj
 * @param func
 * @returns {*}
 */
c.flatMap = function(obj, func) {
    if (Array.isArray(obj)) {
        var r = [];
        for (var i = 0 ; i < obj.length ; i++) {
            var e = func(obj[i]);
            for (var j = 0 ; j < e.length ; j++) {
                r.push(e[j]);
            }
        }
        return r;
    }

    //object
    var r1 = {};
    for (var k in obj) {
        if (obj.hasOwnProperty(k)) {
            var o2 = func(k, obj[k]);
            for (var k2 in o2) {
                if (o2.hasOwnProperty(k2)) {
                    r1[k2] = o2[k2];
                }
            }
        }
    }
    return r1;
};
