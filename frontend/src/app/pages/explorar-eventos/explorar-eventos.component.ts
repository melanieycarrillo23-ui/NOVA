import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Evento } from '../../models/models';
import { EventosService } from '../../services/eventos.service';
@Component({selector:'app-explorar-eventos',standalone:true,imports:[CommonModule,FormsModule,RouterLink],template:`
<div class="row between wrap"><div><h1 class="page-title">Explorar eventos</h1><p class="page-subtitle">Encuentra experiencias disponibles en NOVA.</p></div><div style="width:min(340px,100%)"><input [(ngModel)]="busqueda" placeholder="Buscar por nombre, categoría o lugar"></div></div>
<div class="grid grid-3"><a class="card event-card" *ngFor="let e of filtrados()" [routerLink]="['/eventos',e.id]"><div class="event-top"><span class="badge">{{e.categoria_nombre || 'Evento'}}</span><span class="badge green">{{e.estado}}</span></div><h3>{{e.nombre}}</h3><p class="secondary">{{e.descripcion_corta}}</p><div class="event-meta"><span>{{e.fecha_hora_inicio | date:'medium'}}</span><span>{{e.lugar_nombre || e.modalidad}}</span></div></a></div><div class="empty" *ngIf="!filtrados().length">No encontramos eventos con ese criterio.</div>`})
export class ExplorarEventosComponent implements OnInit{api=inject(EventosService);eventos=signal<Evento[]>([]);busqueda='';filtrados=computed(()=>{const q=this.busqueda.trim().toLowerCase();return !q?this.eventos():this.eventos().filter(e=>[e.nombre,e.categoria_nombre,e.lugar_nombre].some(v=>(v||'').toLowerCase().includes(q)))});ngOnInit(){this.api.listarEventos().subscribe(r=>this.eventos.set(r.results))}}
