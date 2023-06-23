import * as common from '/pages/src/common.mjs';

async function main() {
    common.subscribe('athlete/self', watching => {
      // console.log("Gears?:", watching);
      if (watching.KICKRgear){
        // console.log("set gears",watching.KICKRgear.cr);
        try{
          document.querySelector(".chainring" ).textContent = watching.KICKRgear.cr;
          document.querySelector(".gearnumber").textContent = watching.KICKRgear.gr;
        }catch {}
      }
      if(watching.KICKbrake){
        if (watching.KICKbrake.down){
          let indicator = document.querySelector(".brakes .${watching.KICKbrake.side}");
          if (indicator) {
            indicator.classList.add("brakesOn")
          }
        } else {
          document.querySelector(".brakes div").forEach(e=>e.classList.remove("brakesOn"));
        }
      }
      if(watching.KICKpower){
        try{

          document.querySelector(".watts" ).textContent = watching.KICKRpower;
        }catch{}

      }
    });

}

main();
