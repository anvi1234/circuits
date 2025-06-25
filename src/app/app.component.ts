import { AfterViewInit, Component,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { FormsModule } from '@angular/forms';
import { DeviceDetail } from './schematic/Utils/OnCanvasMouseRelease';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  ngOnInit(): void {
   // DeviceDetail.init();
  }
  title = 'circuit';

  ngAfterViewInit() {
    // Wait a little in case CircuitJS loads after Angular
    setTimeout(() => {
      const panel = document.getElementById('painel');
      if (panel && panel.parentNode) {
        panel.parentNode.removeChild(panel);
      }
  
      // Optional: adjust the layout if needed
      const container = document.querySelector('div[style*="position: absolute"][style*="width: 166px"]');
      if (container) {
        container.remove();
      }
    }, 1000); // Adjust timing if needed
  }

}
