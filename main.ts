
//% color="#AA278D" weight=100
namespace claps {
    const NO_CLAP_TIMEOUT = 1000;
    const POLLING_TIME = 100;

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

            loops.everyInterval(POLLING_TIME, () => {
                if (!this.lastClapTime) {
                    return
                }

                if (control.millis() - this.lastClapTime >= NO_CLAP_TIMEOUT) {
                    for (let handler of this.handlers) {
                        if (handler.isValid(this.clapTimes)) {
                            handler.fn();
                        }
                    }
                    this.clapTimes = [];
                    this.lastClapTime = undefined;
                }
            })
        }

        updateOnLoudHandler() {
            this.onLoudHandler = () => {
                let time = control.millis();
                this.clapTimes.push(time);
                this.lastClapTime = time;
            }
        }

        setXClapHandler(x: number, handler: ()=>void) {
            let isValid = (clapTimes: number[]) => {
                return clapTimes.length === x;
            }
            this.handlers.push(new ClapHandler(isValid, handler));
            this.updateOnLoudHandler();
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
        clapDetector.setXClapHandler(1, handler);
    }

    //% block="on double clap"
    export function onDoubleClap(handler: ()=>void) {
        let clapDetector = ClapDetector.getClapDetector();
        clapDetector.setXClapHandler(2, handler);
    }

    //% block="on $x claps"
    export function onXClap(x: number, handler: ()=>void) {
        let clapDetector = ClapDetector.getClapDetector();
        clapDetector.setXClapHandler(x, handler);
    }

}
