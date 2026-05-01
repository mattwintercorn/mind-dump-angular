import { Routes } from '@angular/router';
import { IdeaListComponent } from './features/ideas/components/idea-list/idea-list.component';

export const routes: Routes = [
  { path: '', redirectTo: '/ideas', pathMatch: 'full' },
  { path: 'ideas', component: IdeaListComponent }
];
