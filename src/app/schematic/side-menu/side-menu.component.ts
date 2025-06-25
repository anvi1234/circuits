import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GWT_COMMAND, Command, selectItem } from '../Utils/Command';
import { EventListner, EVENT_NAME } from '../Utils/EventListner';
import { DeviceComponent } from '../Utils/device';
import { DEVICE_CURD_OPREATION, DeviceCurd } from '../Utils/DeviceDetails';
import { Session } from 'inspector';
declare var CircuitJS1: any;
@Component({
  selector: 'app-side-menu',
  templateUrl: './side-menu.component.html',
  styleUrls: ['./side-menu.component.scss'],
})
export class SideMenuComponent {
  cmd = GWT_COMMAND;
  subCirLis: DeviceComponent[]=[];
  constructor(private changeDetectorRef: ChangeDetectorRef) {
    EventListner.addEvent(EVENT_NAME.SELECTION_CHANGE, () => {
      this.changeDetectorRef.detectChanges();
    });
    this.subCirLis = DeviceCurd.getItems()//.filter((d:DeviceComponent)=>d.is_instance);
    console.log("subCirList==>",this.subCirLis)
  }
  addDevice(d: Command) {
   try {
    CircuitJS1.menuPerformed(d.name, d.value);
    selectItem(d);
   } catch (error) {
    console.log("error", error)
   }
  }
  openSubCir(s:DeviceComponent){
    CircuitJS1.menuPerformed("main",  "CustomCompositeElm:"+s.cell_name);
  }
}
