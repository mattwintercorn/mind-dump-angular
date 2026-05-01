import { Routes } from '@angular/router';
import { IdeaListComponent } from './features/ideas/components/idea-list/idea-list.component';
import { ForceGraphComponent } from './features/visualization/components/force-graph/force-graph.component';
import { ClusterGraphComponent } from './features/visualization/components/cluster-graph/cluster-graph.component';

export const routes: Routes = [
  { path: '', redirectTo: '/ideas', pathMatch: 'full' },
  { path: 'ideas', component: IdeaListComponent },
  { path: 'graph', component: ForceGraphComponent },
  { path: 'cluster', component: ClusterGraphComponent }
];
