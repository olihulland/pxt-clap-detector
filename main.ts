
//% color="#AA278D" weight=100
namespace claps {
    const NO_CLAP_TIMEOUT = 1000;
    const POST_WAKE_CAPTURE_TIMEOUT = 2000;
    const POLLING_TIME = 100;

    enum Status {
        AWAITING_WAKE,
        CAPTURING_POST_WAKE,
        CAPTURING_COMPLETE
    }

    class ClapDetector {
        private static singletonClapDetector : ClapDetector;
        static getClapDetector() {
            if (!ClapDetector.singletonClapDetector) {
                ClapDetector.singletonClapDetector = new ClapDetector();
            }
            return ClapDetector.singletonClapDetector;
        }

        private clapTimes: number[];
        private lastClapTime: number;

        private wokenAt: number;

        private captureClapCount: number;

        private onLoudHandler: ()=>void;    // updated by updateOnLoudHandler()
        private onClapInstance: ()=>void;

        private handlers: ClapHandler[];
        private captureHandlers: ClapCaptureHandler[];

        private status: Status;

        private constructor() {
            this.clapTimes = [];
            this.handlers = [];
            this.captureHandlers = [];
            this.captureClapCount = 0;
            this.updateOnLoudHandler();
            this.status = Status.AWAITING_WAKE;

            input.onSound(DetectedSound.Loud, this.onLoudHandler);

            loops.everyInterval(POLLING_TIME, () => {
                if (!this.lastClapTime) {   // no claps yet registered
                    return
                }

                if (this.status === Status.CAPTURING_COMPLETE) {
                    this.status = Status.AWAITING_WAKE;
                    this.clapTimes = [];
                    this.lastClapTime = undefined;
                    this.captureClapCount = 0;
                    this.wokenAt = undefined;
                    return;
                }

                if (this.status === Status.AWAITING_WAKE && control.millis() - this.lastClapTime >= NO_CLAP_TIMEOUT) {
                    this.status = Status.CAPTURING_POST_WAKE;   // important to ensure following claps start being counted right away
                    for (let handler of this.handlers) {
                        if (handler.isValid(this.clapTimes)) {
                            handler.fn();
                        }
                    }

                    let anyValidCHandlers = false;
                    for (let cHandler of this.captureHandlers) {
                        if (cHandler.isValid(this.clapTimes)) {
                            anyValidCHandlers = true;
                            break;
                        }
                    }
                    this.status = anyValidCHandlers ? Status.CAPTURING_POST_WAKE : Status.CAPTURING_COMPLETE;
                    if (anyValidCHandlers) {
                        this.wokenAt = control.millis();
                    }
                }

                if (this.status === Status.CAPTURING_POST_WAKE) {
                    const t = control.millis()
                    const sinceWake = t - this.wokenAt
                    const sinceClap = t - this.lastClapTime
                    if (sinceWake >= POST_WAKE_CAPTURE_TIMEOUT && sinceClap >= POST_WAKE_CAPTURE_TIMEOUT) {
                        for (let cHandler of this.captureHandlers) {
                            if (cHandler.woken) {
                                cHandler.fn(this.captureClapCount);
                                cHandler.reset();
                            }
                        }
                        this.status = Status.CAPTURING_COMPLETE;
                    }
                }
            })
        }

        updateOnLoudHandler() {
            this.onLoudHandler = () => {
                if (this.onClapInstance) {
                    this.onClapInstance();
                }
                if (this.status === Status.CAPTURING_POST_WAKE) {
                    this.captureClapCount ++;
                    this.lastClapTime = control.millis();
                } else {
                    let time = control.millis();
                    this.clapTimes.push(time);
                    this.lastClapTime = time;
                }
            }
        }

        setXClapHandler(x: number, handler: ()=>void) {
            let isValid = (clapTimes: number[]) => {
                return clapTimes.length === x;
            }
            this.handlers.push(new ClapHandler(isValid, handler));
            this.updateOnLoudHandler();
        }

        setXClapCaptureHandler(x: number, handler: (count: number)=>void) {
            let isValid = (clapTimes: number[]) => {
                return clapTimes.length === x;
            }
            this.captureHandlers.push(new ClapCaptureHandler(isValid, handler));
            this.updateOnLoudHandler();
        }

        setOnClapInstanceHandler(handler: ()=>void) {
            this.onClapInstance = handler;
            this.updateOnLoudHandler();
        }
    }

    class ClapHandler {
        isValid: (clapTimes : number[]) => boolean;
        fn: any;

        constructor(isValid: (clapTimes: number[])=>boolean, fn: ()=>void) {
            this.isValid = isValid;
            this.fn = fn;
        }
    }

    class ClapCaptureHandler extends ClapHandler {
        woken: boolean;

        constructor(isValid: (clapTimes: number[])=>boolean, fn: (count: number)=>void) {
            super(isValid, ()=>{});
            this.isValid = (clapTimes: number[]) => {
                this.woken = isValid(clapTimes);
                return this.woken;
            };
            this.fn = fn;
            this.woken = false;
        }

        reset() {
            this.woken = false;
        }
    }


    /* --- BLOCKS --- */

    //% block="on one clap"
    export function onOnelap(handler: ()=>void) {
        let clapDetector = ClapDetector.getClapDetector();
        clapDetector.setXClapHandler(1, handler);
    }

    //% block="on double clap"
    export function onDoubleClap(handler: ()=>void) {
        let clapDetector = ClapDetector.getClapDetector();
        clapDetector.setXClapHandler(2, handler);
    }

    //% block="on triple clap"
    export function onTripleClap(handler: ()=>void) {
        let clapDetector = ClapDetector.getClapDetector();
        clapDetector.setXClapHandler(3, handler);
    }

    //% block="on $x claps"
    //% x.min=1 x.max=20
    export function onXClap(x: number, handler: ()=>void) {
        let clapDetector = ClapDetector.getClapDetector();
        clapDetector.setXClapHandler(x, handler);
    }

    //% block="on $x claps followed by $count single claps"
    //% x.min=1 x.max=20
    //% draggableParameters="reporter"
    export function onXClapsCapture(x: number, handler: (count: number)=>void) {
        let clapDetector = ClapDetector.getClapDetector();
        clapDetector.setXClapCaptureHandler(x, handler);
    }

    //% block="on double clap followed by $count single claps"
    //% draggableParameters="reporter"
    export function onDoubleClapsCapture(handler: (count: number)=>void) {
        let clapDetector = ClapDetector.getClapDetector();
        clapDetector.setXClapCaptureHandler(2, handler);
    }

    //% block="on triple clap followed by $count single claps"
    //% draggableParameters="reporter"
    export function onTripleClapsCapture(handler: (count: number)=>void) {
        let clapDetector = ClapDetector.getClapDetector();
        clapDetector.setXClapCaptureHandler(3, handler);
    }

    //% block="on clap instance"
    export function onClapInstance(handler: ()=>void) {
        let clapDetector = ClapDetector.getClapDetector();
        clapDetector.setOnClapInstanceHandler(handler);
    }

}
