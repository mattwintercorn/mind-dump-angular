import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  effect,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import * as d3 from 'd3';
import { Idea } from '../../../../core/models/idea.model';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  idea: Idea;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

@Component({
  selector: 'app-force-graph',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './force-graph.component.html',
  styleUrls: ['./force-graph.component.scss'],
})
export class ForceGraphComponent implements OnInit, OnDestroy {
  ideas = input.required<Idea[]>();

  @ViewChild('svgContainer', { static: true })
  svgContainer!: ElementRef<SVGSVGElement>;

  private simulation!: d3.Simulation<GraphNode, GraphLink>;
  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private g!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private zoom!: d3.ZoomBehavior<SVGSVGElement, unknown>;

  private nodes: GraphNode[] = [];
  private links: GraphLink[] = [];

  constructor() {
    effect(() => {
      const ideas = this.ideas();
      if (ideas && this.simulation) {
        this.updateGraph(ideas);
      }
    });
  }

  ngOnInit(): void {
    this.initializeSimulation();
  }

  ngOnDestroy(): void {
    if (this.simulation) {
      this.simulation.stop();
    }
  }

  private initializeSimulation(): void {
    const element = this.svgContainer.nativeElement;
    const width = element.clientWidth;
    const height = element.clientHeight;

    this.svg = d3.select(element);
    this.g = this.svg.append('g');

    // Zoom behavior
    this.zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        this.g.attr('transform', event.transform);
      });

    this.svg.call(this.zoom);

    // Initialize simulation
    this.simulation = d3
      .forceSimulation<GraphNode, GraphLink>()
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>()
          .id((d) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50));
  }

  private updateGraph(ideas: Idea[]): void {
    if (!this.simulation) return;

    // Build nodes
    this.nodes = ideas.map((idea) => ({
      id: idea.id,
      label: idea.title,
      idea,
    }));

    // Build links based on shared keywords
    this.links = [];
    for (let i = 0; i < ideas.length; i++) {
      for (let j = i + 1; j < ideas.length; j++) {
        const sharedKeywords = ideas[i].keywords.filter((k) =>
          ideas[j].keywords.includes(k)
        );
        if (sharedKeywords.length > 0) {
          this.links.push({
            source: ideas[i].id,
            target: ideas[j].id,
          });
        }
      }
    }

    this.render();
  }

  private render(): void {
    // Clear existing elements
    this.g.selectAll('*').remove();

    // Render links
    const link = this.g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(this.links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-width', 2);

    // Render nodes
    const node = this.g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(this.nodes)
      .enter()
      .append('g')
      .call(this.createDragBehavior());

    node
      .append('circle')
      .attr('r', 20)
      .attr('fill', (d) => d.idea.color);

    node
      .append('text')
      .text((d) => d.label)
      .attr('x', 25)
      .attr('y', 5)
      .attr('font-size', '12px')
      .attr('fill', '#333');

    // Update simulation
    this.simulation.nodes(this.nodes);
    (this.simulation.force('link') as d3.ForceLink<GraphNode, GraphLink>).links(
      this.links
    );

    this.simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
        .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
        .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
        .attr('y2', (d) => (d.target as GraphNode).y ?? 0);

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    this.simulation.alpha(1).restart();
  }

  private createDragBehavior() {
    return d3
      .drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }

  zoomIn(): void {
    this.svg.transition().call(this.zoom.scaleBy, 1.3);
  }

  zoomOut(): void {
    this.svg.transition().call(this.zoom.scaleBy, 0.7);
  }

  resetZoom(): void {
    this.svg
      .transition()
      .call(this.zoom.transform, d3.zoomIdentity);
  }
}
