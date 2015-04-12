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

            $('#views').change(function (e) {
                app.loadView($(e.target).attr('value'));
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
            });
        },

        filterData: function (filter) {
            var test = _.matches(filter);

            _.each(app.data, function (school) {
                school.filtered = !_.isEmpty(filter) && !test(school);
            });

            if (app.view) { app.view.refresh(); }
        },

        setCategory: function (category) {
            var includedCategories = category === 'gened' ?
                ['enrollment', 'specialty', 'perpupilmin', 'stabilization'] :
                [category];

            _.each(app.data, function (school) {
                school.selected = {}
                _.each(school.budget, function (lines, year) {
                    var partition = _.partition(lines, function (line) {
                        return _.includes(includedCategories, line.category);
                    }),
                        sum = function (sum, line) {
                            return sum + line.value;
                        },
                        selected = {};

                    selected.lines = partition[0];
                    selected.total = _.reduce(selected.lines, sum, 0);
                    selected.lines.push({
                        category: 'other',
                        value: _.reduce(partition[1], sum, 0)
                    });
                    selected.fullBudget = _.reduce(selected.lines, sum, 0);

                    school.selected[year] = selected;
                });

                school.change = null;
                if (_.has(school.selected), CURRENT_YEAR - 1) {
                    school.change = school.selected[CURRENT_YEAR].total /
                        school.selected[CURRENT_YEAR - 1].total - 1;
                }
            });

            if (app.view) { app.view.refresh(); }
        },

        loadView: function (view) {
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

        var that = this,
            maxSchool = this.data[0],
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
        schoolView.selectAll('.field.atriskfunds')
            .text('$' + commasFormatter(d.atRiskFunds));
        schoolView.selectAll('.field.byformulafunds')
            .text('$' + commasFormatter(d.atRiskCount * 2079));
        schoolView.selectAll('.field.perstudentfunds')
            .text('$' + commasFormatter(d.atRiskFunds / d.atRiskCount));
        schoolView.selectAll('a.learndc')
            .attr('href', 'http://learndc.org/schoolprofiles/view?s=' + d.code + '#overview');

        budgetLines.selectAll('li').remove();

        _(d.budgetLines).pairs()
            .filter(function (a) { return a[1] > 0; })
            .sortBy(function (a) { return -a[1]; })
            .each(function (a) {
                budgetLines.append('li')
                    .html('<span class="amount">$' + commasFormatter(a[1]) + '</span> ' + a[0]);
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

    views.Bubbles = function (data) {
        var that = this;

        this.margin = {top: 120, right: 20, bottom: 40, left: 60};
        this.data = data;
        this.$el = $('#exhibit');

        this.x = d3.scale.linear().domain([0, 650]);
        this.y = d3.scale.linear().domain([0, MAX]);

        this.svg = d3.select('#exhibit').append('svg')
            .attr('class', 'bubble chart');
        this.g = this.svg.append('g')
            .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

        this.bg = this.g.append('g');
        this.fg = this.g.append('g');
        this.interactionLayer = this.g.append('g');

        d3.select('#exhibit')
            .append('div')
            .attr('class', 'instruction')
            .append('h3')
            .text('Click on a school to view details');

        this.mouseover = function (d) {
            that.fg.select('.bubble.school-' + d.code)
                .classed('highlighted', true)
                .transition()
                .ease('elastic')
                .duration(900)
                .attr('r', 18);

            var tooltip = d3.select('#tooltip');

            tooltip.selectAll('.field.schoolname')
                .text(d.name);
            tooltip.selectAll('.field.atriskcount')
                .text(d.atRiskCount);
            tooltip.selectAll('.field.atriskpercent')
                .text((d.atRiskCount / d.enrollment * 100).toFixed(0));
            tooltip.selectAll('.field.atriskfunds')
                .text('$' + commasFormatter(d.atRiskFunds));
            tooltip.selectAll('.field.perstudentfunds')
                .text('$' + commasFormatter(d.atRiskFunds / d.atRiskCount));

            tooltip.style('display', 'block');
        };

        this.mouseout = function (d) {
            that.fg.select('.bubble.school-' + d.code)
                .classed('highlighted', false)
                .transition()
                .ease('elastic')
                .duration(900)
                .attr('r', 6);

            d3.select('#tooltip').style('display', 'none');
        };

        this.click = function (d) {
            populateSchoolView(d3.select('#school-view'), d);
            $('#school-view').slideDown();
            $('#school-view button.close').click(function () {
                $('#school-view').slideUp();
            });
        };

        $('svg.bubble.chart').on('mousemove', function (e) {
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

    views.Bubbles.prototype.resize = function () {
        var xAxis, yAxis,
            elWidth = this.$el.width(),
            width = elWidth - this.margin.left - this.margin.right,
            height = 400 - this.margin.top - this.margin.bottom,
            that = this;

        this.pageWidth = elWidth + 16;

        this.svg
            .attr('width', width + this.margin.left + this.margin.right)
            .attr('height', height + this.margin.top + this.margin.bottom);

        this.x.range([0, width]);
        this.y.range([height, 0]);

        xAxis = d3.svg.axis()
            .scale(this.x)
            .ticks(width > 800 ? 13 : 6)
            .tickSize(-height - 20)
            .orient('bottom');

        yAxis = d3.svg.axis()
            .scale(this.y)
            .tickValues([0, 250000, 500000, 750000, 1000000, 1250000, 1500000])
            .tickFormat(function (d) { return '$' + commasFormatter(d / 1000) + 'K'; })
            .tickSize(-width - 20)
            .orient('left');

        this.voronoi = d3.geom.voronoi()
            .x(function (d) { return that.x(d.atRiskCount); })
            .y(function (d) { return d.atRiskFunds > MAX ? -10 : that.y(d.atRiskFunds); })
            .clipExtent([[-20, -20],
                [width + 20, height + 20]]);

        this.bg.selectAll('.axis').remove();
        this.bg.selectAll('.guide').remove();

        this.bg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + (height + 10) + ')')
            .call(xAxis)
            .append('text')
                .attr('class', 'label')
                .attr('x', width - 5)
                .attr('y', -16)
                .style('text-anchor', 'end')
                .text('# of At-Risk Students');

        this.bg.append('g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(-10,0)')
            .call(yAxis)
            .append('text')
                .attr('class', 'label')
                .attr('transform', 'rotate(-90)')
                .attr('x', -4)
                .attr('y', 16)
                .attr('dy', '.71em')
                .style('text-anchor', 'end')
                .text('Total At-Risk Funds');

        this.bg.append('line')
            .attr('class', 'guide')
            .attr('x1', this.x(0))
            .attr('y1', this.y(0))
            .attr('x2', this.x(650))
            .attr('y2', this.y(2079 * 650));

        this.bg.append('text')
            .attr('class', 'guide')
            .attr('x', this.x(650))
            .attr('y', this.y(2079 * 650) - 3)
            .attr("transform", 'rotate(' +
                (Math.atan(
                    (this.y(2079 * 650) - this.y(0)) /
                        (this.x(650) - this.x(0))
                ) * (180 / Math.PI)) +
                ' ' + this.x(650) +
                ' ' + this.y(2079 * 650) +
                ')')
            .style('text-anchor', 'end')
            .text('Funds Allotted Per Student ($2,079)');

        this.refresh();
    };

    views.Bubbles.prototype.refresh = function () {
        var bubbles,
            voronoiPaths,
            that = this;

        bubbles = this.fg.selectAll('.bubble')
            .data(this.data);

        bubbles.enter().append('circle')
            .attr('class', function (d) { return 'bubble school-' + d.code; })
            .attr('r', 6)
            .attr('cy', this.y(0));

        bubbles.attr('cx', function (d) { return that.x(d.atRiskCount); })
            .transition()
            .ease('elastic')
            .duration(900)
            .delay(function (d) { return d.atRiskCount / 2 + Math.random() * 300; })
            .attr('r', function (d) { return d.filtered ? 3 : 6; })
            .attr('cy', function (d) { return d.atRiskFunds > MAX ? -10 : that.y(d.atRiskFunds); })
            .each('start', function () { d3.select(this).classed('disabled', function (d) { return d.filtered; }); });

        voronoiPaths = this.interactionLayer.selectAll('.voronoi')
            .data(this.voronoi(_.reject(this.data, 'filtered')));

        voronoiPaths.enter().append('path')
            .attr('class', 'voronoi')
            .on('mouseover', this.mouseover)
            .on('mouseout', this.mouseout)
            .on('click', this.click);

        voronoiPaths.attr('d', function (d) { return 'M' + d.join('L') + 'Z'; })
            .datum(function (d) { return d.point; });

        voronoiPaths.exit().remove();
    };

}());