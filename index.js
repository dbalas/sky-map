const stars = [];
const constellations = [];

let undoStack = [];
let redoStack = [];
let currentSelected;

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

function star(el, x, y) {
	const radius = 0.5;
	const color = 'white';

	const s = el
		.append('circle')
		.classed('star', true)
		.attr('r', radius)
		.style('fill', color)
		.style('filter', 'url(#glow)')
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
			d3.select(this).attr('r', radius * 2).classed('hovered', true);
		})
		.on('mouseout', function() {
			const el = d3.select(this);

			if (!el.attr('class').split(' ').includes('active')) {
				d3.select(this).attr('r', radius).classed('hovered', false);
			}
		});
	if (x && y) {
		s.attr('cx', x).attr('cy', y);
		undoStack.push(s);
	} else {
		s.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
	}
}

function link(el, x1, y1, x2, y2) {
	const strokeWitdh = 0.1;
	let l = el
		.append('line')
		.classed('link', true)
		.style('stroke', 'white')
		.style('stroke-width', strokeWitdh)
		.attr('shape-rendering', 'auto');

	if (x1 && y1 && x2 && y2) {
		l.attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2);
		undoStack.push(l);
	} else {
		l
			.attr('x1', (d) => d.sourceX)
			.attr('y1', (d) => d.sourceY)
			.attr('x2', (d) => d.targetX)
			.attr('y2', (d) => d.targetY);
	}
}

function getLinks(stars, constellations) {
	const starMap = stars.reduce((map, star) => {
		map[star.id] = star;
		return map;
	}, {});

	return constellations.reduce((links, constellation) => {
		return [
			...links,
			...constellation.slice(1).map((star, index) => ({
				sourceX: starMap[constellation[index]].x,
				sourceY: starMap[constellation[index]].y,
				targetX: starMap[star].x,
				targetY: starMap[star].y
			}))
		];
	}, []);
}

const svg = d3
	.select('#sky-map')
	.append('svg')
	.attr('viewBox', '0 0 500 500')
	.attr('preserveAspectRatio', 'xMinYMin meet')
	.call(glow);

// Stars
svg.selectAll('circle.star').data(stars).enter().call(star);

// Links
svg.selectAll('line.link').data(getLinks(stars, constellations)).enter().call(link);

// Editing
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
