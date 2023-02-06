
//% color="#AA278D" weight=100
namespace claps {
  const NO_CLAP_TIMEOUT = 1000;

  class ClapDetector {
    private static singletonClapDetector : ClapDetector;
    static getClapDetector() {
      if (!ClapDetector.singletonClapDetector) {
        ClapDetector.singletonClapDetector = new ClapDetector();
      }
      return ClapDetector.singletonClapDetector;
    }

    private clapTimes: number[] = [];
    private lastClapTime: number;

    private onLoudHandler: ()=>void;

    private handlers: ClapHandler[];


    constructor() {
      this.handlers = [];
      this.updateOnLoudHandler();
      input.onSound(DetectedSound.Loud, this.onLoudHandler);
    }

    updateOnLoudHandler() {
      this.onLoudHandler = () => {
        let time = control.millis();
        this.clapTimes.push(time);
        this.lastClapTime = time;

        for (let handler of this.handlers) {
          if (handler.isValid(this.clapTimes)) {
            handler.fn();
          }
        }
      }
    }

    setSingleClapHandler(handler: ()=>void) {
      let isValid = () => {
        // only called if clap so always valid
        return true;
      }
      this.handlers.push(new ClapHandler(isValid, handler));
      this.updateOnLoudHandler();

      // TODO need to have it wait for TIMEOUT before execute in-case it becomes a double clap etc.
    }

  }

  class ClapHandler {
    isValid: (clapTimes : number[]) => boolean;
    fn: ()=>void;

    constructor(isValid: (clapTimes: number[])=>boolean, fn: ()=>void) {
      this.isValid = isValid;
      this.fn = fn;
    }
  }


  /* --- BLOCKS --- */

  //% block="on clap"
  export function onClap(handler: ()=>void) {
    let clapDetector = ClapDetector.getClapDetector();
    clapDetector.setSingleClapHandler(handler);
  }


}
