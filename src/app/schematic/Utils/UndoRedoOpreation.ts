import { afterRender } from "@angular/core";
import { EVENT_NAME, EventListner } from "./EventListner";
import { DeviceComponent } from "./device";
import { Circuit, CircuitConst } from "./device/Circuit";
import { DEVICE_TYPE } from "./device/DeviceConst";
import { cloneDevice, getAllDevice, getDeviceToCircuitObj } from "./device/util";
import * as _ from 'lodash';

declare var CircuitJS1: any;
declare var onCanvasMouseRelease:any;
declare var ongwtEvent:any;


export const UNDO_REDO_OPREATION={
    ADD:"add",
    DELETE:"delete",
    MOVE:"move",
    ROTATION_CLOCKWISE:"rotation_clockwise",
    ROTATION_ANTI_CLOCKWISE:"rotation_anti_clockwise"
}
export class UndoRedo{
   static window: any = window;
   static undo:any=[];
   static redo:any=[];
   static copyCutData:any={
    isCopy:null,
    data:[],
    undoIndex:-1,
   }
  static resetCopyCutData(){
    this.copyCutData={
      isCopy:null,
      data:[],
      undoIndex:-1,
     }
  } 
  static addHistry(id:any){
      onCanvasMouseRelease(null);
    const deviceCir:DeviceComponent= getDeviceToCircuitObj()
    let cirList:any=[];
    if(id){
      const divData=deviceCir.device.find((d)=>d.id==id)
      if(divData){
          cirList.push(_.cloneDeep(divData));
      } 
    }
    else{
      cirList= deviceCir.device.filter((d)=>d.is_selected);
    }
    if(cirList.length>0){
      this.undo.push({data:_.cloneDeep(cirList),isDeleted:false, afterData:null})
      this.redo=[]
    }
    // if(!id)
    //  cirList= deviceCir.device.filter((d)=>d.is_selected);
    // if(cirList.length<=0){
    //     this.undo.push({data:cirList,isDeleted:false})
    // }
    // else{
      // const divData=deviceCir.device.find((d)=>d.id==id)
      // if(divData){
      //     cirList.push(divData);
      // }
    // }
    //console.log("undo==>",this.undo)
    CircuitJS1.resetAction();
   }

   static deleteOpreation(ids: number[]) {
    const deviceCir = getDeviceToCircuitObj();
    const toDelete = deviceCir.device.filter(d => ids.includes(d.id));
    if (toDelete.length === 0) {
      console.warn("No elements found to delete for IDs:", ids);
      return;
    }
     this.undo = this.undo.filter((item:any) => {
      const idInArray2 = item.data?.[0]?.id;
      return !toDelete.some(wire => wire.id === idInArray2);
    });
    toDelete.forEach(d => {
      CircuitJS1.deleteEle(d.id);
      CircuitJS1.resetAction();
    });

    const cloned = toDelete.map((e:any) => ({ ...e }));
      this.undo.push({ data:  _.cloneDeep(cloned), isDeleted: true });
      // this.undo.push({ data: _.cloneDeep(cloned), isDeleted: true,afterData:null});
    this.redo = [];
      // Optional: Re-render canvas
      setTimeout(() => onCanvasMouseRelease(), 100); 
  }


   static doUndo() {
    let typeForRedo = ''
    let clonedData = [];
    if (this.undo.length === 0) return;
   if(this.checkForDuplicates(this.undo)){
     this.replaceMethod();
   }
   else{
    this.changeType()
   }
   
    let { isDeleted, data, afterData,type } = this.undo.pop();
    clonedData = data;
    const cirObj: any = {};
    if(afterData && data && type==='swap'){
      data.forEach((d: any) => {
        if (d.type !== DEVICE_TYPE.SUB_CIRCUIT) {
          CircuitJS1.rotateEleById(d.id, 1);
          CircuitJS1.rotateEleById(d.id, 1);
        }
      }); 
    }
    else{
    if (isDeleted === true && !afterData) {
      data = _.cloneDeep(data);
      data.forEach((item:any) => {
       const freshItem = _.cloneDeep(item);
          this.manuallyRestoreDevice(freshItem)
 
      
      });   
    }

    else if(isDeleted === false && type=='drag'){
      typeForRedo = 'drag'
      this.redraw(data);
     
        clonedData = afterData;
        type=null
    } 
    else {  
      data.forEach((item:any) => {
        CircuitJS1.deleteEle(item.id);
   
      });
    } 
    } 
    // Push to redo
    const cloned = clonedData.map((e:any) => ({ ...e }));
    this.redo.push({ data: cloned, isDeleted: false, afterData:null,type: typeForRedo});
  
    setTimeout(onCanvasMouseRelease, 100);
  }

  static changeType(){
    this.undo.forEach((d:any)=>{
      if(d.type === 'drag'){
        d.type = null;
      }
    })
  }


static manuallyRestoreDevice(item: any) {
  // 1. Create new circuit of same type at same location
  const circuit = new Circuit(undefined, item.x, item.y, item.x1, item.y1, item.type);
  circuit.setName(item.name);
  circuit.setPortList(item.port_list);
  circuit.createNewCircuit();

  // 2. Wait and update name + ports
  setTimeout(() => {
    const raw = CircuitJS1.getAllDevice?.();
    const devices = typeof raw === 'string' ? JSON.parse(raw) : raw;

    const matched = devices.find((d: any) =>
      d.type === item.type &&
      d.x == item.x && d.y == item.y &&
      d.x2 == item.x1 && d.y2 == item.y1
    );

    if (matched) {
      circuit.id = matched.id;
      circuit.updateComman(matched.id); // Set name and ports
      CircuitJS1.setPostion(circuit.id, +item.x, +item.y, +item.x1, +item.y1);
      CircuitJS1.resetAction(); // Optional, for interaction state
    } else {
      console.warn("❌ Could not find re-added device in canvas");
    }
  }, 100);
}




static redraw(data:any) {
  data.forEach((item:any) => {
    const circuit = new Circuit(item.id, item.x, item.y, item.x1, item.y1, item.type);
    circuit.setName(item.name); // Set the name property
    circuit.setPostion();       // Set the position
    circuit.updateComman(item.id); // Update the name and ports via deviceInfo
  })
}

 static replaceMethod() {
  const seenIds = new Set<number>();
  const filteredUndo: any[] = [];
  const idCount = new Map<number, number>();
  
// Step 1: Count all IDs
for (const item of this.undo) {
  for (const obj of item.data) {
    idCount.set(obj.id, (idCount.get(obj.id) || 0) + 1);
  }
}
  // Step 2: Filter and set type
for (const item of this.undo) {
  if (item.data.length === 1) {
    const obj = item.data[0];
    const isDuplicate = idCount.get(obj.id)! > 1;

    if (!seenIds.has(obj.id)) {
      seenIds.add(obj.id);

      filteredUndo.push({
        data: [obj],
        isDeleted: false,
        type: isDuplicate ? 'drag' : null
      });
    }
  } else {
    // For entries with multiple items, you can set type as needed (optional)
    filteredUndo.push(item);
  }
}

  // Create a map for fast replacement
  const singleDataMap = new Map<number, any>();
  for (const item of filteredUndo) {
    if (item.data.length === 1) {
      const obj = item.data[0];
      singleDataMap.set(obj.id, obj);
    }
  }

  // Replace multi-data entries with corresponding single entries
  const result = filteredUndo.map((item: any) => {
    if (item.data.length > 1) {
      return {
         afterData: item.data,
        data: item.data.map((d: any) => singleDataMap.get(d.id) ?? d),
       
        isDeleted: item.isDeleted,
        type: item.isDeleted === false ? 'drag' : null
      };
    }
    return item;
  });

  this.undo = result;
}

static checkForDuplicates(data: { data:any[] }[]): boolean {
  const seen = new Set<number>();

  for (const entry of data) {
    for (const item of entry.data) {
      if (seen.has(item.id)) {
        return true; // Duplicate found
      }
      seen.add(item.id);
    }
  }

  return false; // No duplicates
}

  static doRndo() {
    if (this.redo.length <= 0) return;
  
    let { isDeleted, data,afterData,type } = this.redo.pop();
    const cirObj: any = {};
  
    this.undo.forEach((cirL: any) => {
      cirL.data.forEach((d: any) => {
        if (!cirObj[d.id]) cirObj[d.id] = [];
        cirObj[d.id].push(d);
      });
    });
  
    if(afterData && data){
      afterData.forEach((d: any) => {
        if (d.type !== DEVICE_TYPE.SUB_CIRCUIT) {
          CircuitJS1.rotateEleById(d.id, 1);
          CircuitJS1.rotateEleById(d.id, 1);
        }
      }); 
    }
   else{
     if (isDeleted) {
      data.forEach((d: any) => {
        CircuitJS1.deleteEle(d.id);
      });

    }
     else if(isDeleted === false && type=='drag'){
      this.redraw(data);
        data = data;
    } 
    
    else {
      data.forEach((d: any) => {
        if (!cirObj[d.id] || cirObj[d.id].length === 0) {
          CircuitJS1.addUndoEle(d);  // ✅ pass full object
        }
      });
  
      data.forEach((d: any) => {
        if (typeof d.setPosition === 'function') d.setPosition(); // ✅ Fix typo
        if (typeof d.update === 'function') d.update(d.id);
      });
    }
   }
  
    this.undo.push({ isDeleted, data });
  
    // ✅ Redraw after all changes
    setTimeout(() => {
      EventListner.emit(EVENT_NAME.HANDLE_CLICK_ACTIVITY, {});
      onCanvasMouseRelease();
    }, 100);
  }
  
 static rotateAllEle(id:any,isclockWise:boolean){
  const deviceCir:DeviceComponent= getDeviceToCircuitObj()
    let cirList:any=[];
    if(!id)
     cirList= deviceCir.device.filter((d)=>d.is_selected);
    if(cirList.length<=0){
        const divData=deviceCir.device.find((d)=>d.id==id)
        if(divData){
            cirList.push(divData);
        }
    }
    if(cirList.length>0){
        cirList.forEach((d:any)=>{
          if(d.type!=DEVICE_TYPE.SUB_CIRCUIT){
            CircuitJS1.rotateEleById(d.id,isclockWise?0:1)
            CircuitJS1.updateElePositionsOrBounds(d.id);
            CircuitJS1.repaint();
          }
        
        })
        this.addHistry(null);
    }
 }
 static copyOrCut(id:any,isCopy:boolean){
  const deviceCir:DeviceComponent= getDeviceToCircuitObj()
  let cirList:any=[];
  if(!id)
   cirList= deviceCir.device.filter((d)=>d.is_selected);
  if(cirList.length<=0){
      const divData=deviceCir.device.find((d)=>d.id==id)
      if(divData){
          cirList.push(divData);
      }
  }
  this.copyCutData.data=cirList;
  this.copyCutData.isCopy=isCopy;
  if(isCopy){
    this.copyCutData.undoIndex=-1;
  }
  else{
    // this.deleteOpreation(-1);
    this.copyCutData.undoIndex=this.undo.length-1;
  }
  console.log("copycutdata==>",this.copyCutData)
 }
 static getMidPointOfSelectedCir(cirList:Array<Circuit>){
    let x:any=null,y:any=null,x1:any=null,y1:any=null;
    cirList.forEach((d:Circuit)=>{
      d.x=parseInt(d.x+"");
      d.y=parseInt(d.y+"");
      d.x1=parseInt(d.x1+"");
      d.y1=parseInt(d.y1+"");
      if(x==null || x<d.x ){
        x=d.x
      }
      if(y==null || y<d.y ){
        y=d.y
      }
      if(x1==null || x1<d.x1 ){
        x=d.x1
      }
      if(y1==null || y1<d.y1 ){
        y=d.y1
      }


      if(x==null || x>d.x ){
        x1=d.x
      }
      if(y==null || y>d.y ){
        y1=d.y
      }
      if(x1==null || x1>d.x1 ){
        x1=d.x1
      }
      if(y1==null || y1>d.y1 ){
        y1=d.y1
      }
    })
    const midX=Math.ceil((x+x1)/2);
    const midY=Math.ceil((y+y1)/2);
    return {midX,midY}
 }
 static convertAxix(n:any){
  const num=parseInt(n+"");
  const rem=num%16;
  console.log("num==>",num,rem)
  return num+16-rem;
 }
 static pasteEle(){
  if(this.copyCutData.data.length>0 && CircuitConst?.last_mouse_down_pos?.x){
     if(this.copyCutData.isCopy){
        let deviceCount=CircuitJS1.getDeviceCount();
        if(deviceCount>0){
          const cloneCir=this.copyCutData.data.map((d:any)=>{
            d.setNameById(deviceCount);
            d.id=deviceCount;
            deviceCount++;
              return cloneDevice(d);
          })
         const cirStr= cloneCir.map((d:any)=>{
           // console.log("copy cir==>",d.toCircuitString())
           return d.toCircuitString();
          }).join("\n");
          localStorage.setItem("circuitClipboard",cirStr);
          const {x,y}=CircuitConst.last_mouse_down_pos;
          CircuitJS1.setMouseCursor(x,y)
          CircuitJS1.menuPerformed("edit","paste");
          localStorage.setItem("circuitClipboard","");
          CircuitConst.is_copy_ele=true;
          cloneCir.forEach((d:any)=>{
            d.update(d.id);
          })
          CircuitConst.is_copy_ele=false;
          this.addHistry(null);
       }
     }
     else{
      if(CircuitConst.last_mouse_down_pos){
        let cloneCir=this.copyCutData.data.map((d:any)=>{
            return cloneDevice(d);
        })
        let {midX,midY} =this.getMidPointOfSelectedCir(cloneCir);
        midX=this.convertAxix(midX);
        midY=this.convertAxix(midY)
        let {x,y}=CircuitConst.last_mouse_down_pos;
         x=this.convertAxix(x);
         y=this.convertAxix(y);
        cloneCir=cloneCir.map((d:Circuit)=>{
            CircuitJS1.undoById(parseInt(d.id+""));
            const disX=this.convertAxix(d.x-midX);
            const disY=this.convertAxix(d.y-midY);
            const disX1=this.convertAxix(d.x1-midX);
            const disY1=this.convertAxix(d.y1-midY);
            d.x=x+disX;
            d.y=y+disY;
            d.x1=x+disX1;
            d.y1=y+disY1;
            d.setPostion();
            return d;
        })
        //this.doUndo(false);
        // cloneCir.forEach((d:any)=>{
        //   d.setPostion();
        // })
        this.undo=this.undo.filter((d:any,i:any)=>i!=this.copyCutData.undoIndex)
        this.resetCopyCutData();
        this.addHistry(null);
        this.doUndo();
        this.doRndo();
        //EventListner.emit(EVENT_NAME.HANDLE_CLICK_ACTIVITY,{})
        // if(cloneCir.length>0){
        //   const deviceCir= this.getSelectedDevice();
        //   if(deviceCir.length>0){
        //     setTimeout(()=>{
        //       ongwtEvent(deviceCir[0].id,JSON.stringify(deviceCir[0].basic_info))
        //     },100)
        //   }
        // }
      }
     }
  }
 }
static dublicateEle(){
  const deviceCir:DeviceComponent= getDeviceToCircuitObj()
  let cirList:any=[];
   cirList= deviceCir.device.filter((d)=>d.is_selected);
   const {midX} =this.getMidPointOfSelectedCir(cirList);
   const width=(CircuitConst.canvas.width)/2;
   let offset=112;
   if(width<midX){
    offset=-112;
   }
  //  cirList=cirList.map((d:Circuit)=>{
  //     d.x=d.x+offset;
  //     d.y=d.y+offset;
  //     d.x1=d.x1+offset;
  //     d.y1=d.y1+offset;
  //     return d;
  //   })
  //   const cirStr= cirList.map((d:any)=>{
  //     // console.log("copy cir==>",d.toCircuitString())
  //     return d.toCircuitString();
  //    }).join("\n");
  //    localStorage.setItem("circuitClipboard",cirStr);
  //    CircuitJS1.menuPerformed("edit","paste");
  //    localStorage.setItem("circuitClipboard","");
  //    CircuitConst.is_copy_ele=true;
  //   //  cloneCir.forEach((d:any)=>{
  //   //    d.update();
  //   //  })
  //    CircuitConst.is_copy_ele=false;
  //    this.addHistry(null);
   //const height=CircuitConst.canvas.height;

  if(cirList.length>0){
    let deviceCount=CircuitJS1.getDeviceCount();
    if(deviceCount>0){
      let cloneCir=cirList.map((d:any)=>{
        d.setNameById(deviceCount);
        d.id=deviceCount;
        deviceCount++;
          return cloneDevice(d);
      })
     const cirStr= cloneCir.map((d:any)=>{
       // console.log("copy cir==>",d.toCircuitString())
       return d.toCircuitString();
      }).join("\n");
      localStorage.setItem("circuitClipboard",cirStr);
      CircuitJS1.menuPerformed("edit","paste");
      localStorage.setItem("circuitClipboard","");

      cloneCir=cloneCir.map((d:Circuit)=>{
        d.x=d.x+offset;
       // d.y=d.y+offset;
        d.x1=d.x1+offset;
        //d.y1=d.y1+offset;
        return d;
      })

      cloneCir.forEach((d:any)=>{
           d.setPostion();
      })
      CircuitConst.is_copy_ele=true;
      cloneCir.forEach((d:any)=>{
        d.update(d.id);
      })
      CircuitConst.is_copy_ele=false;
      this.addHistry(null);
    }
  }
}

static swapTerminal() {
  const deviceCir: DeviceComponent = getDeviceToCircuitObj();
  let cirList: any[] = deviceCir.device.filter((d) => d.is_selected);
  if (cirList.length > 0) {
    // Deep clone the current state for undo
    const backup = _.cloneDeep(cirList);
    // Perform swap (rotate twice)
    cirList.forEach((d: any) => {
      if (d.type !== DEVICE_TYPE.SUB_CIRCUIT) {
        CircuitJS1.rotateEleById(d.id, 1);
        CircuitJS1.rotateEleById(d.id, 1);
      }
    });
    // After rotations, re-fetch updated device list to reflect changes
    const updatedDeviceCir: DeviceComponent = getDeviceToCircuitObj();
    let updatedCirList: any[] = updatedDeviceCir.device.filter((d) => d.is_selected);
    // Deep clone the state after rotation from updated devices
    const afterState = _.cloneDeep(updatedCirList);
  
    // Save history for the rotation action
    this.addHistryforRotate(backup, false, afterState,'swap');
  }
}

static addHistryforRotate(data: any[], isDeleted: boolean = false,afterData:any[],type:string) {
  this.undo.push({ data, isDeleted, afterData, type});
   this.redo.push({ data, isDeleted, afterData,type});
}

static getSelectedDevice(){
  const deviceCir= getAllDevice()
  let cirList:any=[];
   cirList= deviceCir.filter((d:any)=>d.is_selected.toLowerCase()=="true");
  return cirList || []
}
}