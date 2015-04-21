/*jslint browser: true*/
/*jslint nomen: true*/
/*global $, _, d3*/

(function () {
    'use strict';

    var app,
        views,
        populateSchoolView,

        DATA_PATH = 'data/data.csv',

        CURRENT_YEAR = 2016,

        CATEGORIES = {
            enrollment: 'Enrollment-Based Funds',
            specialty: 'Specialty Funds',
            perpupilmin: 'Per-Pupil Funding Minimum Funds',
            stabilization: 'Stabilization Funds',
            sped: 'Special Education Funds',
            ell: 'English Language Learner Funds',
            atrisk: 'At-Risk Funds',
            income: 'Federal Title and ASP/ECR Funds'
        },

        commasFormatter = d3.format(',.0f'),
        schoolCodeFormatter = d3.format('04d');

    $(function () {
        d3.csv(DATA_PATH, function (d) {
            var row = {
                name: d.SCHOOLNAME,
                year: +d.YEAR,
                code: schoolCodeFormatter(d.SCHOOLCODE),
                ward: d.WARD === '' ? null : d.WARD,
                level: d.LEVEL === '' ? null : d.LEVEL,
                fortyForty: d.FORTYFORTY,
                budget: {},
                enrollment: {}
            };

            row.budget[d.YEAR] = [
                { category: "enrollment", value: +d.AMT_ENROLLMENT },
                { category: "specialty", value: +d.AMT_SPECIALTY },
                { category: "perpupilmin", value: +d.AMT_PPFM },
                { category: "stabilization", value: +d.AMT_STABILIZATION },
                { category: "sped", value: +d.AMT_SPED },
                { category: "ell", value: +d.AMT_ELL },
                { category: "atrisk", value: +d.AMT_ATRISK },
                { category: "income", value: (+d.AMT_TITLE) + (+d.AMT_ASPECR) }
            ];

            row.enrollment[d.YEAR] = {
                total:  d.TOTALENROLLMENT === '' ? null : +d.TOTALENROLLMENT,
                atRisk: d.ATRISKENROLLMENT === '' ? null : +d.ATRISKENROLLMENT,
                sped:   d.SPEDENROLLMENT === '' ? null : +d.SPEDENROLLMENT,
                ell:    d.ELLENROLLMENT === '' ? null : +d.ELLENROLLMENT,
                ece:    d.ECEENROLLMENT === '' ? null : +d.ECEENROLLMENT
            };

            return row;
        }, app.initialize);
    });

    app = {
        initialize: function (data) {
            app.globals = {};

            $('#loading').fadeOut();
            $('#main').fadeIn();

            $('p.what a').click(function () {
                var id = $.attr(this, 'href');
                $('html, body').animate({
                    scrollTop: $(id).offset().top
                }, 500);
                return false;
            });

            var partition = _.partition(_.reject(data,{level: 'other'}), {year: CURRENT_YEAR});

            app.data = partition[0];

            _.each(partition[1], function (row) {
                var school = _.find(app.data, function (school) {
                    return school.code === row.code;
                });

                school.budget[row.year] = row.budget[row.year];
                school.enrollment[row.year] = row.enrollment[row.year];
            });

            app.filterData({});
            app.setCategory('gened');
            app.loadView('Bars');

            $(window).resize(function () { app.view.resize(); });

            function checkLegendVisibility() {
                if (app.globals.category === 'gened' && app.globals.view === 'Bars') {
                    $('#legend').removeClass('hidden');
                } else {
                    $('#legend').addClass('hidden');
                }
            }

            checkLegendVisibility();

            $('#views').change(function (e) {
                app.loadView($(e.target).attr('value'));
                checkLegendVisibility();
            });

            $('#filters').change(function () {
                var filter = {};
                $('#filters input:checked').each(function () {
                    var $el = $(this),
                        value = $el.attr('value');

                    if (value) { filter[$el.attr('name')] = value; }
                });

                app.filterData(filter);
            });

            $('#categories').change(function (e) {
                app.setCategory($(e.target).attr('value'));
                checkLegendVisibility();
            });
        },

        filterData: function (filter) {
            app.globals.filter = filter;

            var test = _.matches(filter);

            _.each(app.data, function (school) {
                school.filtered = !_.isEmpty(filter) && !test(school);
            });

            if (app.view) { app.view.refresh(); }
        },

        setCategory: function (category) {
            app.globals.category = category;

            var includedCategories = category === 'gened' ?
                    ['enrollment', 'specialty', 'perpupilmin', 'stabilization'] :
                    [category],
                sum = function (sum, line) {
                    return sum + line.value;
                };

            _.each(app.data, function (school) {
                school.selected = {};
                _.each(school.budget, function (lines, year) {
                    var total, partition, selected;

                    if (category === 'total') {
                        total = _.reduce(lines, sum, 0);

                        selected = {
                            lines: [{ category: 'total', value: total }],
                            total: total,
                            fullBudget: total
                        };
                    } else {
                        partition = _.partition(lines, function (line) {
                            return _.includes(includedCategories, line.category);
                        });
                        selected = {};

                        selected.lines = partition[0];
                        selected.total = _.reduce(selected.lines, sum, 0);
                        selected.lines.push({
                            category: 'other',
                            value: _.reduce(partition[1], sum, 0)
                        });
                        selected.fullBudget = _.reduce(selected.lines, sum, 0);
                    }

                    school.selected[year] = selected;
                });

                school.change = null;
                if (_.has(school.selected, CURRENT_YEAR - 1)) {
                    school.change = (school.selected[CURRENT_YEAR].total /
                            school.enrollment[CURRENT_YEAR].total) /
                        (school.selected[CURRENT_YEAR - 1].total /
                            school.enrollment[CURRENT_YEAR - 1].total) - 1;
                }

                school.enrchange = null;
                if (_.has(school.selected, CURRENT_YEAR - 1)) {
                    school.enrchange = ( school.enrollment[CURRENT_YEAR].total / school.enrollment[CURRENT_YEAR - 1].total ) - 1;
                }

            });

            if (app.view) { app.view.refresh(); }
        },

        loadView: function (view) {
            app.globals.view = view;

            $('#exhibit').empty();
            $('#school-view').hide();
            app.view = new views[view](app.data);
        }
    };

    window.app = app;

    views = {};

    views.Bars = function (data) {
        var header,
            that = this;

        this.$el = $('#exhibit');

        this.data = _.sortBy(data, function (d) {
            return -(d.selected[CURRENT_YEAR].fullBudget / d.enrollment[CURRENT_YEAR].total);
        });

        this.table = d3.select('#exhibit')
            .append('table')
            .attr('class', 'bar-chart')
            .attr('summary', 'Schools by the funding per student');

        header = this.table.append('thead')
            .append('tr');

        header.append('th')
            .attr('scope', 'col')
            .attr('data-sort', 'name')
            .text('School Name')
            .append('span')
            .attr('class', 'sort-arrow');
        header.append('th')
            .attr('scope', 'col')
            .attr('data-sort', 'enrollment')
            .attr('class', 'descending')
            .text('2016 Enrollment')
            .append('span')
            .attr('class', 'sort-arrow');
        header.append('th')
            .attr('scope', 'col')
            .attr('data-sort', 'budget')
            .attr('class', 'selected descending')
            .text('Funds per Student')
            .append('span')
            .attr('class', 'sort-arrow');
        header.append('th')
            .attr('scope', 'col')
            .attr('data-sort', 'change')
            .attr('class', 'descending')
            .text('Change in Funds per Student')
            .append('span')
            .attr('class', 'sort-arrow');

        $('table.bar-chart th').click(function () {
            var descending,
                target = $(this),
                key = target.data('sort');

            if (!target.hasClass('selected') || key === 'name') {
                $('table.bar-chart th').removeClass('selected');
                target.addClass('selected');
            } else {
                target.toggleClass('descending');
            }

            descending = target.hasClass('descending');

            that.refresh(function (d) {
                var val;

                switch (key) {
                case 'budget':
                    val = d.selected[CURRENT_YEAR].total / d.enrollment[CURRENT_YEAR].total;
                    break;
                case 'enrollment':
                    val = d.enrollment[CURRENT_YEAR].total;
                    break;
                default:
                    val = d[key];
                }

                return descending ? -val : val;
            });
        });

        this.tbody = this.table.append('tbody');

        this.removeSchoolViews = function (noAnimate) {
            $('.bar-chart .school-view').slideUp({
                duration: noAnimate ? 0 : 400,
                complete: function () {
                    $(this).parent().parent().remove();
                }
            });
        };

        this.sort = function (d) {
            return -(d.selected[CURRENT_YEAR].total / d.enrollment[CURRENT_YEAR].total);
        };

        this.click = function (d) {
            that.removeSchoolViews();

            if (!d.code || d.code === that.expandedRow) {
                that.expandedRow = null;
            } else {
                that.expandedRow = d.code;

                var tr = $('<tr>')
                        .addClass('school-view-row' +
                            ($(this).hasClass('odd') ? ' odd' : '')),
                    td = $('<td>')
                        .attr('colspan', 4)
                        .appendTo(tr),
                    schoolView = $('#school-view').clone().removeAttr('id');

                populateSchoolView(d3.select(schoolView[0]), d);
                schoolView.find('button.close')
                    .click(function () {
                        that.expandedRow = null;
                        that.removeSchoolViews();
                    });
                schoolView.appendTo(td);

                $(this).after(tr);

                schoolView.slideDown();
            }
        };

        this.refresh();
    };

    views.Bars.prototype.resize = function () {
        return;
    };

    views.Bars.prototype.refresh = function (sort) {
        this.removeSchoolViews(true);

        this.sort = sort || this.sort;

        var maxSchool = this.data[0],
            max = maxSchool.selected[CURRENT_YEAR].fullBudget /
                maxSchool.enrollment[CURRENT_YEAR].total,
            rows = this.tbody.selectAll('tr.bar')
                .data(_.sortBy(this.data, this.sort)),
            rowTemplate = _.template(
                '<td><%= name %></td>' +
                    '<td class="' +
                    '<%= enrchange < 0 ? "negative" : "" %>"> <font color = "343536">' +
                    '<%= enrollment[CURRENT_YEAR].total %> </font> <%= "  (" + (enrchange * 100).toFixed(1) + "%)" %></td>' +
                    '<td>' +
                    '<div class="wrapper">' +
                    '<div class="bar">' +
                    '<span class="year"><%= CURRENT_YEAR + ": " %></span>' +
                    '<span class="label">' +
                    '<%= "$" + commasFormatter(selected[CURRENT_YEAR].total / enrollment[CURRENT_YEAR].total) %>' +
                    '</span>' +
                    '<% _.each(selected[CURRENT_YEAR].lines, function (line) { %>' +
                    '<span ' +
                    'class="rect <%= line.category %>" ' +
                    'style="width: <%= (line.value / enrollment[CURRENT_YEAR].total) / max * 100 %>%;">' +
                    '</span>' +
                    '<% }); %>' +
                    '</div>' +
                    '<% if (selected[CURRENT_YEAR - 1]) { %>' +
                    '<div class="bar previous-year">' +
                    '<span class="year"><%= CURRENT_YEAR - 1 + ": " %></span>' +
                    '<span class="label">' +
                    '<%= "$" + commasFormatter(selected[CURRENT_YEAR - 1].total / enrollment[CURRENT_YEAR - 1].total) %>' +
                    '</span>' +
                    '<% _.each(selected[CURRENT_YEAR - 1].lines, function (line) { %>' +
                    '<span ' +
                    'class="rect <%= line.category %>" ' +
                    'style="width: <%= (line.value / enrollment[CURRENT_YEAR - 1].total) / max * 100 %>%;">' +
                    '</span>' +
                    '<% }); %>' +
                    '</div>' +
                    '<% } %>' +
                    '</div>' +
                    '</td>' +
                    '<td class="' +
                    '<%= change < 0 ? "negative" : "" %>' +
                    '"><%= change ? (change * 100).toFixed(1) + "%" : "NA" %></td>',
                { 'imports': {
                        'commasFormatter': commasFormatter,
                        'CURRENT_YEAR': CURRENT_YEAR,
                        'max': max
                    }}
            ),
            rowCount = 0;

        rows.enter().append('tr')
            .on('click', this.click);

        rows.attr('class', function (d) { return 'bar school-' + d.code; })
            .html(function (d) {
                return rowTemplate(d);
            });

        rows.classed('filtered', function (d) { return d.filtered; })
            .classed('odd', function (d) {
                if (!d.filtered) { rowCount += 1; }
                return rowCount % 2 === 1;
            });

        rows.exit().remove();
    };

    views.Lines = function (data) {
        var that = this,
            labels = {es: 'Elementary', ms: 'Middle', hs: 'High', campus: 'Education Campus'};

        this.margin = {top: 6, right: 2, bottom: 38, left: 42};
        this.data = d3.nest()
            .key(function (d) { return d.level; })
            .entries(_.reject(data, { 'level': null }));
        this.data = _.sortBy(this.data, function (level) {
            return _.indexOf(['es', 'ms', 'hs', 'campus'], level.key);
        });
        this.$el = $('#exhibit');

        this.y = d3.scale.linear();

        this.multiples = d3.select('#exhibit').selectAll('.multiple')
            .data(this.data)
            .enter().append('div')
            .attr('class', function (d) { return 'multiple ' + d.key; });

        this.multiples.append('span')
            .attr('class', 'title')
            .text(function (d) { return labels[d.key]; });

        this.tooltipName = this.multiples.append('span')
            .attr('class', 'tooltip-name');

        this.svg = this.multiples.append('svg')
            .attr('class', 'slopegraph chart');
        this.g = this.svg.append('g')
            .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

        this.fg = this.g.append('g');
        this.bg = this.g.append('g');
        this.tooltipsLayer = this.g.append('g').attr('class', 'tooltips');
        this.interactionLayer = this.g.append('g');

        this.mouseover = function (d) {
            that.fg.select('.line.school-' + d.code)
                .classed('highlighted', true);

            var tooltipsLayer = d3.select(this.parentNode.parentNode)
                    .select('.tooltips'),
                tooltipName = d3.select(this.parentNode.parentNode.parentNode.parentNode)
                    .select('.tooltip-name'),
                prevYearTip = tooltipsLayer.append('g')
                    .attr('class', 'label')
                    .attr('transform', 'translate(' + 30 + ',' + (d.y1 - 8) + ')'),
                currYearTip = tooltipsLayer.append('g')
                    .attr('class', 'label')
                    .attr('transform', 'translate(' + (that.width - 30) + ',' + (d.y2 - 8) + ')');

            tooltipName.text(d.name);

            prevYearTip.append('rect')
                .attr('x', -27)
                .attr('y', -13)
                .attr('width', 55)
                .attr('height', 17)
                .attr('rx', 3)
                .attr('ry', 3);

            prevYearTip.append('text')
                .text('$' + commasFormatter(
                    d.selected[CURRENT_YEAR - 1].total /
                        d.enrollment[CURRENT_YEAR - 1].total
                )).attr('text-anchor', 'middle');

            currYearTip.append('rect')
                .attr('x', -28)
                .attr('y', -13)
                .attr('width', 55)
                .attr('height', 17)
                .attr('rx', 3)
                .attr('ry', 3);

            currYearTip.append('text')
                .text('$' + commasFormatter(
                    d.selected[CURRENT_YEAR].total /
                        d.enrollment[CURRENT_YEAR].total
                )).attr('text-anchor', 'middle');
        };

        this.mouseout = function (d) {
            that.fg.select('.line.school-' + d.code)
                .classed('highlighted', false);

            that.tooltipsLayer.selectAll('.label').remove();
            that.tooltipName.text('');
        };

        this.click = function (d) {
            populateSchoolView(d3.select('#school-view'), d);
            $('#school-view').slideDown();
            $('#school-view button.close').click(function () {
                $('#school-view').slideUp();
            });
        };

        this.resize();
    };

    views.Lines.prototype.resize = function () {
        this.width = this.$el.children().first().width() -
            this.margin.left - this.margin.right;
        this.height = 400 - this.margin.top - this.margin.bottom;

        this.pageWidth = this.$el.width();

        this.svg
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom);

        this.y.range([this.height, 0]);

        this.refresh();
    };

    views.Lines.prototype.refresh = function () {
        var leftAxis, rightAxis, lines, interactionLines,
            max = _.reduce(_(this.data).values().pluck('values').flatten().value(),
                function (max, d) {
                    var maxTotal = Math.max(
                        d.selected[CURRENT_YEAR].total / d.enrollment[CURRENT_YEAR].total,
                        d.selected[CURRENT_YEAR - 1].total / d.enrollment[CURRENT_YEAR - 1].total
                    );

                    return maxTotal > max ? Math.ceil(maxTotal / 2000) * 2000 : max;
                }, 0),
            that = this;

        this.y.domain([0, max]);

        leftAxis = d3.svg.axis()
            .scale(this.y)
            .orient('left')
            .tickSize(0)
            .tickValues([0, max / 2, max])
            .tickFormat(function (d) { return '$' + commasFormatter(d / 1000) + 'K'; });
        rightAxis = d3.svg.axis()
            .scale(this.y)
            .orient('right')
            .tickSize(0)
            .tickFormat("");

        this.bg.selectAll('.axis').remove();

        this.bg.append('g').attr('class', 'axis').call(leftAxis)
            .append('text').text(CURRENT_YEAR - 1)
                .attr('class', 'year')
                .attr('x', 5).attr('y', 15);

        this.bg.append('g').attr('class', 'axis')
            .attr("transform", "translate(" + this.width + ",0)")
            .call(rightAxis)
            .append('text').text(CURRENT_YEAR)
                .attr('class', 'year')
                .attr('text-anchor', 'end')
                .attr('x', -5).attr('y', 15);

        this.bg.selectAll('.tick text')
            .style('text-anchor', 'middle')
            .attr('x', -(this.margin.left + this.margin.right) / 2);

        lines = this.fg.selectAll('.line')
            .data(function (d) { return d.values; });

        lines.enter().append('line')
            .attr('class', function (d) { return 'line school-' + d.code; })
            .attr('x1', 0)
            .attr('x2', this.width);

        lines.classed('filtered', function (d) { return d.filtered; });

        lines.transition()
            .duration(400)
            .attr('y1', function (d) {
                d.y1 = that.y(d.selected[CURRENT_YEAR - 1].total /
                    d.enrollment[CURRENT_YEAR - 1].total);

                return d.y1;
            })
            .attr('y2', function (d) {
                d.y2 = that.y(d.selected[CURRENT_YEAR].total /
                    d.enrollment[CURRENT_YEAR].total);

                return d.y2;
            });

        interactionLines = this.interactionLayer.selectAll('.interaction-line')
            .data(function (d) { return _.reject(d.values, 'filtered'); });

        interactionLines.enter().append('line')
            .attr('class', 'interaction-line')
            .attr('x1', 0)
            .attr('x2', this.width)
            .on('mouseover', this.mouseover)
            .on('mouseout', this.mouseout)
            .on('click', this.click);

        interactionLines
            .attr('y1', function (d) {
                return d.y1;
            })
            .attr('y2', function (d) {
                return d.y2;
            });

        interactionLines.exit().remove();
    };

    populateSchoolView = function (schoolView, d) {
        var budgetLines = schoolView.selectAll('ul.field.budgetlines'),
            pieChart = schoolView.selectAll('div.chart.current-year'),
            previousPieChart = schoolView.selectAll('div.chart.previous-year'),
            percent = d.enrollment[CURRENT_YEAR].atRisk / d.enrollment[CURRENT_YEAR].total,
            previousPercent = d.enrollment[CURRENT_YEAR - 1].atRisk / d.enrollment[CURRENT_YEAR - 1].total,
            radius = 35,
            pie = d3.layout.pie().sort(null),
            arc = d3.svg.arc()
                .innerRadius(radius - 8)
                .outerRadius(radius);

        schoolView.selectAll('.field.schoolname')
            .text(d.name);
        if (d.enrollment[CURRENT_YEAR - 1]) {
            schoolView.selectAll('.field.previous-year.atriskcount')
                .text(d.enrollment[CURRENT_YEAR - 1].atRisk);
            schoolView.selectAll('.field.previous-year.enrollment')
                .text(d.enrollment[CURRENT_YEAR - 1].total);
        } else {
            schoolView.selectAll('.field.previous-year.atriskcount')
                .text('0');
            schoolView.selectAll('.field.previous-year.enrollment')
                .text('0');
        }
        schoolView.selectAll('.field.current-year.atriskcount')
            .text(d.enrollment[CURRENT_YEAR].atRisk);
        schoolView.selectAll('.field.current-year.enrollment')
            .text(d.enrollment[CURRENT_YEAR].total);
        schoolView.selectAll('a.learndc')
            .attr('href', 'http://learndc.org/schoolprofiles/view?s=' + d.code + '#overview');

        budgetLines.selectAll('li').remove();

        _.forEach({ current: CURRENT_YEAR, previous: CURRENT_YEAR - 1},
            function (year, key) {
                var ul = schoolView.selectAll('ul.field.budgetlines.' + key + '-year'),
                    lines = d.budget[year];

                _.each(lines, function (line) {
                    ul.append('li')
                        .html('<span class="amount">$' +
                            commasFormatter(line.value) +
                            '</span> ' +
                            CATEGORIES[line.category]);
                });
            });

        makeapie(previousPieChart, previousPercent);
        makeapie(pieChart, percent);

        function makeapie (div, percent) {
            div.selectAll('svg').remove();

            var chart = div.append('svg')
                .attr('width', '70px')
                .attr('height', '70px')
                .append("g");

            chart.attr('transform', 'translate(' + radius + ',' + radius + ')')
                .selectAll('.arc')
                .data(pie([0, 1]))
                .enter()
                .append('path')
                .attr('class', 'arc')
                .attr('d', function (d) {
                    this._current = d;
                    return arc(d);
                })
                .data(pie([percent, 1 - percent]))
                .transition()
                .duration(1000 * percent)
                .attrTween('d', function (d) {
                    var interpolate = d3.interpolate(this._current, d);
                    return function (t) {
                        return arc(interpolate(t));
                    };
                });

            chart.append('text')
                .attr('class', 'amount')
                .attr('y', 5)
                .style('text-anchor', 'middle')
                .text('0%')
                .transition()
                .duration(1000 * percent)
                .tween('text', function () {
                    var i = function (t) {
                        return (percent * t * 100).toFixed(0) + '%';
                    };

                    return function (t) { this.textContent = i(t); };
                });
        }
    };

}());
