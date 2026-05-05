// src/app/features/visualization/components/cluster-graph/cluster-graph.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  effect,
  inject,
  signal,
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import * as d3 from 'd3';
import { Idea } from '../../../../core/models/idea.model';
import { IdeaService } from '../../../../core/services/idea.service';
import { FilterService } from '../../../../core/services/filter.service';
import { ColorService } from '../../../../core/services/color.service';
import { FilterPanelComponent } from '../../../../shared/components/filter-panel/filter-panel.component';

type ClusterMode = 'keyword' | 'component' | 'project';

interface ClusterNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  idea: Idea;
  radius: number;
  clusterKey: string; // keyword or component name
}

interface ClusterAnchor extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'keyword' | 'component' | 'project';
  color: string;
}

@Component({
    selector: 'app-cluster-graph',
    imports: [
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatButtonToggleModule,
    FilterPanelComponent
],
    templateUrl: './cluster-graph.component.html',
    styleUrls: ['./cluster-graph.component.scss']
})
export class ClusterGraphComponent implements OnInit, OnDestroy {
  private ideaService = inject(IdeaService);
  private filterService = inject(FilterService);
  private colorService = inject(ColorService);

  @ViewChild('svgContainer', { static: true })
  svgContainer!: ElementRef<SVGSVGElement>;

  private simulation!: d3.Simulation<ClusterNode | ClusterAnchor, undefined>;
  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private g!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private zoom!: d3.ZoomBehavior<SVGSVGElement, unknown>;

  private nodes: ClusterNode[] = [];
  private anchors: ClusterAnchor[] = [];

  clusterMode = signal<ClusterMode>('keyword');

  constructor() {
    effect(() => {
      const ideas = this.ideaService.ideas();
      const filteredIdeas = this.filterService.filterIdeas(ideas);
      const mode = this.clusterMode();
      if (filteredIdeas && this.simulation) {
        this.updateGraph(filteredIdeas, mode);
      }
    });
  }

  ngOnInit(): void {
    this.initializeSimulation();
    const ideas = this.ideaService.ideas();
    const filteredIdeas = this.filterService.filterIdeas(ideas);
    if (filteredIdeas && filteredIdeas.length > 0) {
      this.updateGraph(filteredIdeas, this.clusterMode());
    }
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

    this.zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        this.g.attr('transform', event.transform);
      });

    this.svg.call(this.zoom);

    this.simulation = d3
      .forceSimulation<ClusterNode | ClusterAnchor>()
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<ClusterNode | ClusterAnchor>().radius((d: any) => {
        return d.radius ? d.radius + 10 : 40;
      }));
  }

  private updateGraph(ideas: Idea[], mode: ClusterMode): void {
    if (!this.simulation) return;

    const clusters = new Map<string, Idea[]>();

    // Group ideas by keyword or component or project
    ideas.forEach(idea => {
      if (mode === 'keyword') {
        idea.keywords.forEach(keyword => {
          if (!clusters.has(keyword)) {
            clusters.set(keyword, []);
          }
          clusters.get(keyword)!.push(idea);
        });
      } else if (mode === 'component') {
        const component = idea.component || 'Uncategorized';
        if (!clusters.has(component)) {
          clusters.set(component, []);
        }
        clusters.get(component)!.push(idea);
      } else {
        const project = idea.project || 'No Project';
        if (!clusters.has(project)) {
          clusters.set(project, []);
        }
        clusters.get(project)!.push(idea);
      }
    });

    // Create anchor nodes for each cluster
    this.anchors = Array.from(clusters.keys()).map(key => ({
      id: `anchor-${key}`,
      name: key,
      type: mode,
      color: mode === 'keyword' 
        ? this.colorService.getKeywordColor(key)
        : mode === 'component' ? '#667eea' : '#3b82f6',
      fx: undefined,
      fy: undefined
    }));

    // Position anchors in a circle
    const centerX = this.svgContainer.nativeElement.clientWidth / 2;
    const centerY = this.svgContainer.nativeElement.clientHeight / 2;
    const radius = Math.min(centerX, centerY) * 0.6;
    
    this.anchors.forEach((anchor, i) => {
      const angle = (i / this.anchors.length) * 2 * Math.PI;
      anchor.fx = centerX + radius * Math.cos(angle);
      anchor.fy = centerY + radius * Math.sin(angle);
    });

    // Create idea nodes
    const nodeMap = new Map<string, ClusterNode>();
    clusters.forEach((clusterIdeas, clusterKey) => {
      clusterIdeas.forEach(idea => {
        if (!nodeMap.has(idea.id)) {
          // Calculate size based on priority
          let baseRadius = 15;
          if (idea.priority === 'high') baseRadius = 20;
          else if (idea.priority === 'medium') baseRadius = 17;

          nodeMap.set(idea.id, {
            id: idea.id,
            label: idea.title,
            idea,
            radius: baseRadius,
            clusterKey
          });
        }
      });
    });

    this.nodes = Array.from(nodeMap.values());

    console.log(`Cluster Graph: ${this.nodes.length} nodes, ${this.anchors.length} ${mode} clusters`);

    this.render();
  }

  private render(): void {
    this.g.selectAll('*').remove();

    // Render cluster anchor nodes
    const anchorGroup = this.g
      .append('g')
      .attr('class', 'anchors')
      .selectAll('g')
      .data(this.anchors)
      .enter()
      .append('g')
      .attr('class', 'anchor-node');

    anchorGroup
      .append('circle')
      .attr('r', 35)
      .attr('fill', d => d.color)
      .attr('opacity', 0.2)
      .attr('stroke', d => d.color)
      .attr('stroke-width', 3);

    anchorGroup
      .append('text')
      .text(d => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', d => d.color)
      .attr('pointer-events', 'none');

    // Render idea nodes
    const nodeGroup = this.g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(this.nodes)
      .enter()
      .append('g')
      .attr('class', 'idea-node')
      .call(this.createDragBehavior());

    nodeGroup
      .append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => d.idea.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    nodeGroup
      .append('title')
      .text(d => `${d.idea.title}\nPriority: ${d.idea.priority}\nCluster: ${d.clusterKey}`);

    nodeGroup
      .append('text')
      .text(d => d.label.length > 20 ? d.label.substring(0, 20) + '...' : d.label)
      .attr('x', d => d.radius + 5)
      .attr('y', 5)
      .attr('font-size', '11px')
      .attr('fill', '#333')
      .attr('pointer-events', 'none');

    // Custom force to pull nodes toward their cluster anchor
    this.simulation.force('cluster', (alpha: number) => {
      this.nodes.forEach(node => {
        const anchor = this.anchors.find(a => a.id === `anchor-${node.clusterKey}`);
        if (anchor && anchor.fx != null && anchor.fy != null) {
          const dx = (anchor.fx - (node.x || 0)) * alpha * 0.1;
          const dy = (anchor.fy - (node.y || 0)) * alpha * 0.1;
          node.vx = (node.vx || 0) + dx;
          node.vy = (node.vy || 0) + dy;
        }
      });
    });

    const allNodes = [...this.anchors, ...this.nodes];
    this.simulation.nodes(allNodes as any);

    this.simulation.on('tick', () => {
      anchorGroup.attr('transform', d => `translate(${d.fx},${d.fy})`);
      nodeGroup.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    this.simulation.alpha(1).restart();
  }

  private createDragBehavior() {
    return d3
      .drag<SVGGElement, ClusterNode>()
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

  switchClusterMode(mode: ClusterMode): void {
    this.clusterMode.set(mode);
  }

  zoomIn(): void {
    this.svg.transition().call(this.zoom.scaleBy, 1.3);
  }

  zoomOut(): void {
    this.svg.transition().call(this.zoom.scaleBy, 0.7);
  }

  resetZoom(): void {
    this.svg.transition().call(this.zoom.transform, d3.zoomIdentity);
  }
}
