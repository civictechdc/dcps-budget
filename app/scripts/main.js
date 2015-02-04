/*jslint browser: true*/
/*jslint nomen: true*/
/*global $, _, d3*/

(function () {
    'use strict';

    var app,
        views,
        populateSchoolView,

        DATA_PATH = 'data/data.csv',

        MAX = 1500000,

        commasFormatter = d3.format(',.0f'),
        schoolCodeFormatter = d3.format('04d');

    $(function () {
        d3.csv(DATA_PATH, function (d) {
            return {
                name: d.SCHOOLNAME,
                code: schoolCodeFormatter(d.SCHOOLCODE),
                ward: d.WARD === '' ? null : d.WARD,
                level: d.LEVEL === '' ? null : d.LEVEL,
                enrollment: d.ENROLLMENT === '' ? null : +d.ENROLLMENT,
                atRiskCount: d.ATRISKCOUNT === '' ? null : +d.ATRISKCOUNT,
                atRiskFunds: d.ATRISKTOTAL === '' ? null : +d.ATRISKTOTAL,
                fortyForty: d.FORTYFORTY,
                budgetLines: {
                    'Dean of Students': +d.DEANOFSTUDENTS,
                    'In-School Suspension Coordinator': +d.ISSCOORDINATOR,
                    'Guidance Counselor': +d.GUIDANCECOUNSELOR,
                    'Attendance Counselor': +d.ATTENDCOUNSELOR,
                    'Psychcologist': +d.PSYCH,
                    'Social Worker': +d.SOCIALWORKER,
                    'Intervention Coach': +d.INTERVENTIONCOACH,
                    'English Teacher': +d.ENGLISHTEACHER,
                    'Math Teacher': +d.MATHTEACHER,
                    'Reading Teacher': +d.READINGTEACHER,
                    'Resource Teacher': +d.RESOURCETEACHER,
                    'Science Teacher': +d.SCIENCETEACHER,
                    'Social Studies Teacher': +d.SOCIALSTUDIESTEACHER,
                    'Art Teacher': +d.ARTTEACHER,
                    'Health/PE Teacher': +d.HEALTHTEACHER,
                    'Music Teacher': +d.MUSICTEACHER,
                    'World Language Teacher': +d.LANGUAGETEACHER,
                    'Special Education Teacher': +d.SPEDTEACHER,
                    'Special Education Aide': +d.SPEDAIDE,
                    'Behavior Technician': +d.BEHAVIORTECH,
                    'Assistant Principal for Intervention': +d.ASSTPRINCIPALINTERVENTION,
                    'Reading Specialist': +d.READINGSPECIALIST,
                    'Assistant Principal for Literacy': +d.ASSTPRINCIPALLITERACY,
                    'Proving What\'s Possible for Student Satisfaction Award': +d.PWPSTUDENTSATISFACTION,
                    'Extended Day Funds': +d.EXTENDEDDAY,
                    'Middle Grade Excursions and Activities': +d.MIDDLEGRADEACTIVITIES,
                    'Evening Credit Recovery': +d.ECR,
                    'Other Funds': +d.OTHER,
                    'New Heights Teen Parent Program': +d.NEWHEIGHTS,
                    'Reading Partners Program': +d.READINGPARTNERS
                }
            };
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

            app.data = _.filter(data, 'atRiskCount');
            app.filterData({});

            app.loadView('Bubbles');

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
        },

        filterData: function (filter) {
            var data = _(app.data).forEach(function (school) {
                school.filtered = false;
            });

            if (!_.isEmpty(filter)) {
                data.reject(filter).forEach(function (school) {
                    school.filtered = true;
                });
            }

            if (app.view) { app.view.refresh(); }
        },

        loadView: function (view) {
            clearTimeout(window.quickUglyGlobalTimeout);
            $('#exhibit').empty();
            $('#school-view').hide();
            app.view = new views[view](app.data);
        }
    };

    window.app = app;

    views = {};

    views.Bubbles = function (data) {
        var that = this;

        this.margin = {top: 120, right: 20, bottom: 40, left: 60};
        this.data = data;
        this.$el = $('#exhibit');

        this.$el.css('overflow', 'visible');
        window.quickUglyGlobalTimeout = setTimeout(function () { that.$el.css('overflow', 'hidden'); }, 900);

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
            .text('Hover over a school to view details');

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
            .text('Funds Alotted Per Student ($2,079)');

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

    views.Bars = function (data) {
        var header,
            that = this;

        this.$el = $('#exhibit');

        this.$el.css('overflow', 'visible');

        this.data = data;
        this.data = _.sortBy(this.data, function (d) {
            return -(d.atRiskFunds / d.atRiskCount);
        });

        this.table = d3.select('#exhibit')
            .append('table')
            .attr('class', 'bar-chart')
            .attr('summary', 'DCPS schools sorted by funding recieved per at-risk student');

        header = this.table.append('thead')
            .append('tr');

        header.append('th')
            .attr('scope', 'col')
            .text('School Name');
        header.append('th')
            .attr('scope', 'col')
            .text('At-Risk Students');
        header.append('th')
            .attr('scope', 'col')
            .text('Funding per Student');

        this.tbody = this.table.append('tbody');

        this.removeSchoolViews = function (noAnimate) {
            $('.bar-chart .school-view').slideUp({
                duration: noAnimate ? 0 : 400,
                complete: function () {
                    $(this).parent().parent().remove();
                }
            });
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
                        .attr('colspan', 3)
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

    views.Bars.prototype.refresh = function () {
        this.removeSchoolViews(true);

        var addAllocatedAmount = function (data) {
                return _.sortBy(data.concat([{
                    name: 'Allotted by Funding Formula',
                    atRiskCount: -1,
                    atRiskFunds: -2079,
                    filtered: false
                }]), function (d) {
                    return -(d.atRiskFunds / d.atRiskCount);
                });
            },
            maxSchool = this.data[0],
            // maxSchool = _.reject(this.data, 'filtered')[0],
            max = maxSchool.atRiskFunds / maxSchool.atRiskCount,
            rows = this.tbody.selectAll('tr.bar')
                .data(addAllocatedAmount(this.data)),
            rowTemplate = _.template(
                '<td><%= name %></td>' +
                    '<td><%= atRiskCount > 0 ? atRiskCount : "" %></td>' +
                    '<td>' +
                    '<div class="wrapper">' +
                    '<span class="line" style="left: ' + (2079 / max * 100) + '%;"></span>' +
                    '<div class="bar">' +
                    '<span class="rect"></span>' +
                    '<%= perStudentFunds %>' +
                    '</div>' +
                    '</div>' +
                    '</td>'
            ),
            rowCount = 0;

        rows.enter().append('tr')
            .attr('class', function (d) { return 'bar ' + (d.code ? 'school-' + d.code : 'allocation'); })
            .html(function (d) {
                d.perStudentFunds = '$' + commasFormatter(d.atRiskFunds / d.atRiskCount);
                return rowTemplate(d);
            })
            .on('click', this.click);

        rows.each(function (d) {
            d3.select(this)
                .select('span.rect')
                .style('width', (d.atRiskFunds / d.atRiskCount / max * 100) + '%');
        });

        rows.classed('filtered', function (d) { return d.filtered; })
            .classed('odd', function (d) {
                if (!d.filtered) { rowCount += 1; }
                return rowCount % 2 === 1;
            });
    };

    populateSchoolView = function (schoolView, d) {
        var budgetLines = schoolView.selectAll('ul.field.budgetlines'),
            pieChart = schoolView.selectAll('div.chart'),
            percent = d.atRiskCount / d.enrollment,
            radius = 35,
            pie = d3.layout.pie().sort(null),
            arc = d3.svg.arc()
                .innerRadius(radius - 8)
                .outerRadius(radius);

        schoolView.selectAll('.field.schoolname')
            .text(d.name);
        schoolView.selectAll('.field.atriskcount')
            .text(d.atRiskCount);
        schoolView.selectAll('.field.enrollment')
            .text(d.enrollment);
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

}());