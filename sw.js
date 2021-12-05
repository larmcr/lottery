// https://www.statskingdom.com/shapiro-wilk-test-calculator.html
var PI = Math.PI
  , PID2 = PI / 2
  , delta5 = 1e-15
  , max_n = 1e3;
  function EXP(e) {
    return Math.exp(e)
}
  function chi_distribution(e, t) {
    if (max_n < e | max_n < t) {
        var r = normal_distribution_2t((POWER(e / t, 1 / 3) + 2 / (9 * t) - 1) / SQRT(2 / (9 * t))) / 2;
        return t < e ? r : 1 - r
    }
    var n = EXP(-.5 * e);
    t % 2 == 1 && (n *= SQRT(2 * e / PI));
    for (var o = t; 2 <= o; )
        n = n * e / o,
        o -= 2;
    for (var a = n, i = t; delta5 * n < a; )
        n += a = a * e / (i += 2);
    return 1 - n
}
    function inv_chi_distribution(e, t) {
    for (var r = .5, n = .5, o = 0; delta5 < n; )
        n /= 2,
        chi_distribution(o = 1 / r - 1, t) > e ? r -= n : r += n;
    return o
}
    function SQRT(e) {
    return Math.sqrt(e)
}
    function inv_normal_distribution(e) {
    return 0 == e ? .5 : .5 < e ? SQRT(inv_chi_distribution(2 * (1 - e), 1)) : -SQRT(inv_chi_distribution(2 * e, 1))
}
    function InvDistribution(e, t, r) {
    var n, o = r, a = 0, i = 0;
    if ("Normal" == e)
        return jStat.normal.inv(t, o.mean, o.std);
    if ("T" == e)
        return jStat.studentt.inv(t, o.df);
    if ("Chi-Square" == e)
        return jStat.chisquare.inv(t, o.df);
    if ("F" == e)
        return (n = jStat.centralF.inv(t, o.df1, o.df2)) || (n = inv_f_approx(t, r)),
        n;
    if ("weibull" == e)
        return jStat.weibull.inv(t, o.scale, o.shape);
    if ("exponential" == e)
        return jStat.exponential.inv(t, o.rate);
    if ("beta" == e)
        return jStat.beta.inv(t, o.alpha, o.beta);
    if ("spr" == e)
        return inv_f_spr(1 - t, o.n);
    if ("binomial" != e && "poisson" != e)
        return "kolmogorov" == e ? inv_distribution(t, r, {
            fun: ks_distribution
        }, 0, 1) : "lilliefors" == e ? inv_distribution(t, r, {
            fun: lili_distribution
        }, 0, 1) : void debug.error("Distribution type: " + e + " doesn't exist.");
    for (; i < t; )
        i += pdf(e, a, r),
        a += 1;
    return a - 1
}
    function SW_a2(e) {
    var t = Math.round(e / 2 - .1);
    var r, n = [], o = [], a = 0, i = 1;
    for (r = 1; r <= e; r++) {
        var l = InvDistribution("Normal", (r - .375) / ((i = 1) * e + .25), {
            mean: 0,
            std: 1
        });
        o.push(l),
        a += Math.pow(l, 2)
    }
    var s = 1 / Math.pow(e, .5)
      , u = -2.706056 * Math.pow(s, 5) + 4.434685 * Math.pow(s, 4) - 2.07119 * Math.pow(s, 3) - .147981 * Math.pow(s, 2) + .221157 * s + o[e - i] * Math.pow(a, -.5)
      , c = -3.582633 * Math.pow(s, 5) + 5.682633 * Math.pow(s, 4) - 1.752461 * Math.pow(s, 3) - .293762 * Math.pow(s, 2) + .042981 * s + o[e - 1 - i] * Math.pow(a, -.5)
      , d = (a - 2 * Math.pow(o[e - i], 2) - 2 * Math.pow(o[e - 1 - i], 2)) / (1 - 2 * Math.pow(u, 2) - 2 * Math.pow(c, 2))
      , f = Math.sqrt(d);
    for (n[1 - i] = u,
    n[2 - i] = c,
    r = 3; r < t + 1; r++)
        n[r - i] = -o[r - i] / f;
    return n
}
    function SW_a(e) {
    return e <= 50 ? SW_a1(e) : e <= 5e3 ? SW_a2(e) : void alert("maximum 5000 values")
}
    function max1(e) {
    return e.reduce(function(e, t) {
        return Math.max(1 * e, 1 * t)
    })
}
    function min1(e) {
    return e.reduce(function(e, t) {
        return Math.min(1 * e, 1 * t)
    })
}
    function xround(e, t) {
    if (void 0 === t && (t = 6),
    "string" == typeof t && (t = Number(t)),
    "infinite" == e)
        return "&infin;";
    if ("ninfinite" == e)
        return "-&infin;";
    var r = Math.log10(1 * Math.abs(e));
    10 < (r = r < 0 ? t : Math.round(r + .5) + t) && (r = 10);
    var n = (1 * e).toPrecision(r);
    return "NaN" == (n = (1 * n).toString()) && (n = e),
    n
}
    function sum1(e) {
    return e.reduce(function(e, t) {
        return 1 * e + 1 * t
    })
}
    function measures(e) {
    var t, r, n, o, a, i, l, s, u, c, d = 0, f = 0, h = 0, m = [], p = [];
    n = (t = sum1(e)) / (r = e.length);
    for (var b = 0; b < r; b++)
        residual1 = e[b] - n,
        c = e[b] + " - " + xround(n, 3),
        m.push(residual1),
        p.push([e[b], c, residual1]),
        d += Math.pow(residual1, 2),
        f += Math.pow(e[b] - n, 3),
        h += Math.pow(e[b] - n, 4);
    return i = 1 < r ? d / (r - 1) : 0,
    l = d / r,
    o = Math.sqrt(i),
    a = Math.sqrt(l),
    s = Math.sqrt(r * (r - 1)) * f / (r * (r - 2) * Math.pow(a, 3)),
    u = r * (r + 1) * (r - 1) * h / ((r - 2) * (r - 3) * Math.pow(d, 2)) - 3 * Math.pow(r - 1, 2) / ((r - 2) * (r - 3)),
    {
        sum: t,
        min: min1(e),
        max: max1(e),
        n: r,
        average: n,
        ss: d,
        s: o,
        sigma: a,
        sample_variance: i,
        variance: l,
        residual_table: p,
        residual: m,
        skewness: s,
        kurtosis: u,
    }
}
    function sw_test(e, t) {
    var r = [...e];
    r = r.sort(function(e, t) {
        return e - t
    });
    for (var n = 0; n < r.length && Number(r[n]) <= 0; n++)
        0 == r[n].length && (r.splice(n, 1),
        n--);
    var o = measures(r)
      , a = o.ss
      , i = o.n;
    if (i <= 5e3) {
        var l = 0
          , s = Math.round(i / 2 - .1)
          , u = SW_a(i);
        for (n = 0; n < s; n++) {
            l += (r[i - n - 1] - r[n]) * u[n]
        }
        var c = Math.pow(l, 2) / a
          , d = .0038915 * Math.pow(Math.log(i), 3) - .083751 * Math.pow(Math.log(i), 2) - .31082 * Math.log(i) - 1.5861
          , f = Math.exp(.0030302 * Math.pow(Math.log(i), 2) - .082676 * Math.log(i) - .4803)
          , h = (Math.log(1 - c) - d) / f
          , m = 1 - jStat.normal.cdf(h, 0, 1)
          , p = inv_normal_distribution(1 - t);
        return {
            w: c,
            b: l,
            statistic: h,
            pvalue: m,
            cval1: -1 / 0,
            cval2: p,
            range1: 1 - Math.exp(f * p + d),
            range2: 1,
            n: r.length,
            ms: o
        }
    }
}
