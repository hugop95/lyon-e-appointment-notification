import axios, {AxiosError, AxiosResponse} from "axios";
import moment from "moment";
import * as fs from "fs";

const sound = require("sound-play")

enum RequestEnum {
  CLEAN_FORM_FROM_SITE = "CLEAN_FORM_FROM_SITE",
  NUMBER_OF_MONTH = "NUMBER_OF_MONTH",
  GET_SERVICE_BEAN_LIST = "GET_SERVICE_BEAN_LIST",
  INIT_MOTIVE_LIST = "INIT_MOTIVE_LIST",
  GET_CLOSED_DAYS_LIST = "GET_CLOSED_DAYS_LIST",
  SET_JAVASCRIPT_GLOBAL_VARIABLE = "SET_JAVASCRIPT_GLOBAL_VARIABLE"
}


interface RelevantData {
  "c0-param0"?: string;
  "c0-param1"?: string;
}

interface DefaultInterface {
  "c0-scriptName": "AjaxSelectionFormFeeder";
  "c0-methodName": string;
  "c0-id": number;
  batchId: number;
  instanceId: 0;
  page: "%2FeAppointment%2Felement%2Fjsp%2Fappointment.jsp";
  scriptSessionId: string;
}

interface PostData extends RelevantData, DefaultInterface {
  callCount: 1;
  nextReverseAjaxIndex: 0;
  "c0-param0": string;
  "c0-param1": string;
}

interface CityProps {
  name: string;
  0: string;
  1: string;
}

class Location {
  public readonly alreadyWarnedDates: { [key: string]: boolean }
  public readonly name: string;
  public readonly 0: string;
  public readonly 1: string;
  public cachedDate: Date;

  constructor(props: CityProps) {
    this.alreadyWarnedDates = {};
    this.name = props.name;
    this["0"] = props["0"];
    this["1"] = props["1"];
  }
}

interface Config {
  delaySeconds: number;
  soundPath: string
  jsessionId: string;
  dwrSessionId: string;
  maxDaysAfterToday: number;
}

export class Main {

  private _batchId: number = 0;
  private _scriptSessionId: string = "AfCfJpHrq8VhW8mJDu6sJLLGHfZXwnkCiho/EtfDiho-76HB6fhu2";
  private _config: Config;
  private _latestRequestCachedDate: Date;
  private static _CITIES: Array<Location> = [
    new Location({
      name: "1er",
      0: "MA1",
      1: "328"
    }),
    new Location({
      name: "2eme",
      0: "MA2",
      1: "330"
    }),
    new Location({
      name: "3eme",
      0: "MA3",
      1: "332"
    }),
    new Location({
      name: "4eme",
      0: "MA4",
      1: "350"
    }),
    new Location({
      name: "5eme - Annexe du Vieux lyon",
      0: "MA5A",
      1: "355"
    }),
    new Location({
      name: "5eme - Point du jour",
      0: "MA5",
      1: "352"
    }),
    new Location({
      name: "6eme",
      0: "MA6",
      1: "348"
    }),
    new Location({
      name: "7eme",
      0: "MA7",
      1: "345"
    }),
    new Location({
      name: "8eme",
      0: "MA8",
      1: "347"
    }),
    new Location({
      name: "9eme - Annexe Duchère",
      0: "MA9D",
      1: "339"
    }),
    new Location({
      name: "9eme - Vaise",
      0: "MA9",
      1: "334"
    })
  ];


  private static C0_METHOD_NAME_MAP: { [key in RequestEnum]: string } = {
    CLEAN_FORM_FROM_SITE: "cleanFormFromSite",
    NUMBER_OF_MONTH: "numberOfMonthToDisplayInCalendar",
    GET_SERVICE_BEAN_LIST: "getServiceBeanList",
    INIT_MOTIVE_LIST: "initMotiveList",
    GET_CLOSED_DAYS_LIST: "getClosedDaysList",
    SET_JAVASCRIPT_GLOBAL_VARIABLE: "setJavascriptGlobalVariable"
  };


  public async start() {
    await this._loadConfig();
    console.log("Analyzing...");
    while (true) {
      for (const city of Object.values(Main._CITIES)) {
        await this._analyzeCity(city);
        await Main._waitSeconds(Math.max(1, this._config.delaySeconds || 0));
      }
    }
  }

  private async _loadConfig(): Promise<void> {
    const config = fs.readFileSync("./src/config.json").toString();
    this._config = JSON.parse(config);
    console.log("Config loaded")
  }

  private async _analyzeCity(city: Location) {
    // const cleanFromSite = await this.postUrl(RequestEnum.CLEAN_FORM_FROM_SITE, {});
    // // console.log(cleanFromSite);
    // const numberOfMonth = await this.postUrl(RequestEnum.NUMBER_OF_MONTH, {
    //   "c0-param0": "string:" + city["0"]
    // });
    // // console.log(numberOfMonth);
    // await this.postUrl(RequestEnum.GET_SERVICE_BEAN_LIST, {
    //   "c0-param0": "string:" + city["0"]
    // });
    // await this.postUrl(RequestEnum.INIT_MOTIVE_LIST, {
    //   "c0-param0": "string:" + city["0"],
    //   "c0-param1": "string:" + city["1"]
    // });
    const [closeDaysListString, cachedDate]: [string, Date] = await this.postUrl(RequestEnum.GET_CLOSED_DAYS_LIST, {
      "c0-param0": "string:" + city["0"],
      "c0-param1": "string:" + city["1"]
    });
    city.cachedDate = cachedDate;
    const match = closeDaysListString.match(/dwr\.engine\.remote\.handleCallback\("\d*","\d*",\[(.*)]\)/)[1];
    const dateArrays: Array<string> = match
    .replaceAll("\"", "")
    .split(",");
    const dates: Array<Date> = dateArrays
    .map((d) => moment(d, "yyyy-MM-DD").startOf("day").toDate());
    let currentDate: Date = moment().startOf("day").toDate();
    let hasMatchForAtLeastOneLocation: boolean
    for (let i = 0; i < Math.max(this._config.maxDaysAfterToday, 90); i++) {
      const mapKey: string = currentDate.toISOString();
      if (city.alreadyWarnedDates[mapKey]) {
        continue;
      }
      const hasMatch: boolean = !dates
      .map((d) => d.getTime())
      .includes(currentDate.getTime());
      if (hasMatch) {
        hasMatchForAtLeastOneLocation = true;
        city.alreadyWarnedDates[mapKey] = true;
        console.log("Free date: " + moment(currentDate).format("DD/MM/yyyy") + ", location: " + city.name);
      }
      currentDate = moment(currentDate).add(26, "h").startOf("day").toDate();
    }
    if (hasMatchForAtLeastOneLocation && this._config.soundPath) {
      sound.play(this._config.soundPath)
    }
    // await this.postUrl(RequestEnum.SET_JAVASCRIPT_GLOBAL_VARIABLE, {});
  }

  private static _waitSeconds(seconds: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve()
      }, seconds * 1000)
    })
  }

  public postUrl(requestEnum: RequestEnum, data: RelevantData): Promise<[any, Date]> {
    let coParam0: string = data["c0-param0"];
    let c0Param1: string = data["c0-param1"];
    switch (requestEnum) {
      case RequestEnum.CLEAN_FORM_FROM_SITE:
        coParam0 = null;
        c0Param1 = null;
        break;
      case RequestEnum.NUMBER_OF_MONTH:
      case RequestEnum.GET_SERVICE_BEAN_LIST:
        c0Param1 = null;
        break;
      case RequestEnum.SET_JAVASCRIPT_GLOBAL_VARIABLE:
        coParam0 = "number:2";
        c0Param1 = "boolean:true";
    }
    return new Promise((resolve) => {
      const postData: PostData = {
        callCount: 1,
        nextReverseAjaxIndex: 0,
        "c0-scriptName": "AjaxSelectionFormFeeder",
        "c0-methodName": Main.C0_METHOD_NAME_MAP[requestEnum],
        "c0-id": 0,
        "c0-param0": data["c0-param0"] || undefined,
        "c0-param1": data["c0-param1"] || undefined,
        batchId: this._batchId,
        instanceId: 0,
        page: "%2FeAppointment%2Felement%2Fjsp%2Fappointment.jsp",
        scriptSessionId: this._scriptSessionId
      };
      this._batchId++;
      let stringValue: string = "";
      for (const [key, value] of Object.entries(postData)) {
        if (value === null || value === undefined) {
          continue;
        }
        stringValue += (key + "=" + value.toString()) + "\n";
      }
      axios.post("https://rendez-vous.lyon.fr/eAppointment/dwr/call/plaincall/AjaxSelectionFormFeeder."
        + Main.C0_METHOD_NAME_MAP[requestEnum] + ".dwr",
        stringValue, {
          headers: {
            Cookie: "JSESSIONID=" + this._config.jsessionId + "; DWRSESSIONID=" + this._config.dwrSessionId
          }
        }).then((result: AxiosResponse) => {
        return resolve([result.data, new Date(result.headers.date)]);
      }).catch((error: AxiosError) => {
        console.error(error.message);
        process.exit(1);
      });
    });
  }
}

new Main().start();
setTimeout(() => {
}, 50000)
