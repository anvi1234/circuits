import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SchematicMainComponent } from './schematic/schematic-main/schematic-main.component';

const routes: Routes = [
  {path:'', component:SchematicMainComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
