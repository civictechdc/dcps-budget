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
            enrollment: 'Enrollment-based funds',
            specialty: 'Specialty funds',
            perpupilmin: 'Per-pupil minimum',
            stabilization: 'Stabilization funds',
            sped: 'Special education',
            ell: 'English learners',
            atrisk: 'At-risk funds',
            income: 'Income-linked (i.e. Title I)'
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
                { category: "enrollment", value: +d.ENROLLMENTFUNDS },
                { category: "specialty", value: +d.SPECIALTY },
                { category: "perpupilmin", value: +d.PERPUPILMIN },
                { category: "stabilization", value: +d.STABILIZATION },
                { category: "sped", value: +d.SPED },
                { category: "ell", value: +d.ELL },
                { category: "atrisk", value: +d.ATRISK },
                { category: "income", value: +d.INCOME }
            ];

            row.enrollment[d.YEAR] = {
                total: d.ENROLLMENT === '' ? null : +d.ENROLLMENT,
                atRisk: d.ATRISKENROLLMENT === '' ? null : +d.ATRISKENROLLMENT,
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

            var partition = _.partition(data, {year: CURRENT_YEAR});

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
            .text('Enrollment')
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
            .text('Change')
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
                    '<td><%= enrollment[CURRENT_YEAR].total %></td>' +
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
                    '"><%= (change * 100).toFixed(1) + "%" %></td>',
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

        this.svg = this.multiples.append('svg')
            .attr('class', 'slopegraph chart');
        this.g = this.svg.append('g')
            .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

        this.fg = this.g.append('g');
        this.bg = this.g.append('g');
        this.interactionLayer = this.g.append('g');

        this.mouseover = function (d) {
            that.fg.select('.line.school-' + d.code)
                .classed('highlighted', true);

            var tooltip = d3.select('#tooltip');

            tooltip.selectAll('.field.schoolname')
                .text(d.name);
            tooltip.selectAll('.field.current-total')
                .text('$' + commasFormatter(d.selected[CURRENT_YEAR].total /
                    d.enrollment[CURRENT_YEAR].total));
            tooltip.selectAll('.field.previous-total')
                .text('$' + commasFormatter(d.selected[CURRENT_YEAR - 1].total /
                    d.enrollment[CURRENT_YEAR - 1].total));

            tooltip.style('display', 'block');
        };

        this.mouseout = function (d) {
            that.fg.select('.line.school-' + d.code)
                .classed('highlighted', false);

            d3.select('#tooltip').style('display', 'none');
        };

        this.click = function (d) {
            populateSchoolView(d3.select('#school-view'), d);
            $('#school-view').slideDown();
            $('#school-view button.close').click(function () {
                $('#school-view').slideUp();
            });
        };

        $('svg.slopegraph.chart').on('mousemove', function (e) {
            var offset,
                xPos = e.pageX;
            if (that.pageWidth && that.pageWidth < xPos + 396) {
                offset = xPos + 409 - that.pageWidth;

                $('#tooltip .arrow').css('left', offset > 370 ? 370 : offset);
                $('#tooltip').css({
                    'left': '',
                    'right': 0
                });
            } else {
                offset = xPos - 42;

                $('#tooltip .arrow').css('left', 15);
                $('#tooltip').css({
                    'left': offset,
                    'right': ''
                });
            }
        });

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

        this.bg.append('g').attr('class', 'axis').call(leftAxis);
        this.bg.append('g').attr('class', 'axis').attr("transform", "translate(" + this.width + ",0)").call(rightAxis);

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
                return that.y(d.selected[CURRENT_YEAR - 1].total /
                    d.enrollment[CURRENT_YEAR - 1].total);
            })
            .attr('y2', function (d) {
                return that.y(d.selected[CURRENT_YEAR].total /
                    d.enrollment[CURRENT_YEAR].total);
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
                return that.y(d.selected[CURRENT_YEAR - 1].total /
                    d.enrollment[CURRENT_YEAR - 1].total);
            })
            .attr('y2', function (d) {
                return that.y(d.selected[CURRENT_YEAR].total /
                    d.enrollment[CURRENT_YEAR].total);
            });

        interactionLines.exit().remove();
    };

    populateSchoolView = function (schoolView, d) {
        var budgetLines = schoolView.selectAll('ul.field.budgetlines'),
            pieChart = schoolView.selectAll('div.chart'),
            percent = d.enrollment[CURRENT_YEAR].atRisk / d.enrollment[CURRENT_YEAR].total,
            radius = 35,
            pie = d3.layout.pie().sort(null),
            arc = d3.svg.arc()
                .innerRadius(radius - 8)
                .outerRadius(radius);

        schoolView.selectAll('.field.schoolname')
            .text(d.name);
        schoolView.selectAll('.field.atriskcount')
            .text(d.enrollment[CURRENT_YEAR].atRisk);
        schoolView.selectAll('.field.enrollment')
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

        pieChart.selectAll('svg').remove();

        pieChart = pieChart.append('svg')
            .attr('width', '70px')
            .attr('height', '70px')
            .append("g");

        pieChart.attr('transform', 'translate(' + radius + ',' + radius + ')')
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

        pieChart.append('text')
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
    };

}());