let stars = localStorage.getItem('stars');
let constellations = localStorage.getItem('constellations');

try {
	stars = JSON.parse(stars) || [];
	constellations = JSON.parse(constellations) || [];
} catch (e) {
	stars = [];
	constellations = [];
}

let undoStack = [];
let redoStack = [];
let currentSelected;
let currentRadius = 1;

function glow(selection) {
	const filter = selection
		.append('defs')
		.append('filter')
		.attr('id', 'glow')
		.attr('width', '300%')
		.attr('height', '300%')
		.attr('x', '-100%')
		.attr('y', '-100%');

	filter.append('feGaussianBlur').attr('result', 'blurred').attr('stdDeviation', '2');

	const feMerge = filter.append('feMerge');

	feMerge.append('feMergeNode').attr('in', 'blurred');

	feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
}

function baseStar(el, r) {
	const radius = r || currentRadius;
	const color = 'white';
	return el.append('circle').classed('star', true).style('fill', color).style('filter', 'url(#glow)');
}

function star(el, x, y, r) {
	const radius = r || currentRadius;
	const color = 'white';

	const s = baseStar(el, r)
		.on('click', function() {
			d3.event.preventDefault();
			d3.event.stopPropagation();

			const selected = d3.select(this);

			if (currentSelected) {
				link(
					svg,
					selected.attr('cx'),
					selected.attr('cy'),
					currentSelected.attr('cx'),
					currentSelected.attr('cy')
				);
				currentSelected.attr('r', radius).style('fill', color).classed('active', false);
				currentSelected = null;
				return;
			} else {
				currentSelected = selected.attr('r', radius * 2).style('fill', 'cyan').classed('active', true);
			}
		})
		.on('mouseover', function(d, i) {
			const el = d3.select(this);
			el.classed('hovered', true);
		})
		.on('mouseout', function() {
			const el = d3.select(this);
			if (!el.attr('class').split(' ').includes('active')) {
				d3.select(this).classed('hovered', false);
			}
		});
	if (x && y) {
		s.attr('cx', x).attr('cy', y).attr('r', radius);
		stars.push({
			x,
			y,
			r: radius
		});
		undoStack.push(s);
	} else {
		s.attr('cx', (d) => d.x).attr('cy', (d) => d.y).attr('r', (d) => d.r);
	}
}

function link(el, x1, y1, x2, y2) {
	const strokeWitdh = 0.5;
	let l = el
		.append('line')
		.classed('link', true)
		.attr('stroke', 'white')
		.attr('stroke-width', strokeWitdh)
		.attr('stroke-linecap', 'round')
		.attr('stroke-linejoin', 'round')
		.attr('vector-effect', 'non-scaling-stroke');

	if (x1 && y1 && x2 && y2) {
		l.attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2);
		undoStack.push(l);
		constellations.push({
			x1: x1,
			y1: y1,
			x2: x2,
			y2: y2
		});
	} else {
		l.attr('x1', (d) => d.x1).attr('y1', (d) => d.y1).attr('x2', (d) => d.x2).attr('y2', (d) => d.y2);
	}
}

////////////////// Painting

const svg = d3
	.select('#sky-map')
	.append('svg')
	.attr('viewBox', '0 0 1000 1000')
	.attr('preserveAspectRatio', 'xMinYMin meet')
	.call(glow);

// Stars
svg.selectAll('circle.star').data(stars).enter().call(star);

// Links
svg.selectAll('line.link').data(constellations).enter().call(link);

// Adding stars
svg.on('click', () => {
	const coords = d3.mouse(svg.node());
	const x = Math.round(coords[0] * 2) / 2;
	const y = Math.round(coords[1] * 2) / 2;
	star(svg, x, y);
});

// Undo/Redo
d3.select('body').on('keydown', () => {
	if (d3.event.which === 90 && d3.event.ctrlKey && !d3.event.shiftKey) {
		const removed = undoStack.pop();
		if (!removed) return;
		removed.remove();
		redoStack.unshift(removed);
	}

	if (d3.event.which === 90 && d3.event.ctrlKey && d3.event.shiftKey) {
		const adding = redoStack.shift();
		if (!adding) return;
		svg.append(() => adding.node());
		undoStack.push(adding);
	}
});

// Toolbar
const toolbar = d3.select('body').insert('div', ':first-child').classed('toolbar', true);

// Save stars and constellations
toolbar.append('button').classed('save', true).html('Save').on('click', (e) => {
	localStorage.setItem('stars', JSON.stringify(stars));
	localStorage.setItem('constellations', JSON.stringify(constellations));
});

// Purge
toolbar.append('button').classed('remove', true).html('Purge').on('click', (e) => {
	localStorage.removeItem('stars');
	localStorage.removeItem('constellations');
	undoStack.forEach((el) => el.remove());
	undoStack = [];
	redoStack = [];
});

// Star type selector
const select = toolbar.append('select').classed('type', true).on('change', (e) => {
	currentRadius = d3.event.target.value;
});

select.append('option').attr('value', '1').html('Small');
select.append('option').attr('value', '2').html('Medium');
select.append('option').attr('value', '3').html('Big');
