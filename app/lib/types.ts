export type GraphQLReturn = {
  data: {
    [key: string]: {
      groupedAggregates?: {
        distinctItems?: {
          [key: string]: string[]
        },
      },
      aggregates?: {
        distinctItems?: {
          [key: string]: string[]
        }
      },
      nodes: {[key: string]: any}[],
      pageInfo?: {
        hasNextPage?: boolean,
        hasPreviousPage?: boolean,
      },
      totalCount?: number
    }
  }
} | {
  errors: {message: string}[]
}

export type GraphQLSingleReturn = {
  data: {
    [key: string]: {
      [key: string]: any}
    }
  } | {
  errors: {message: string}[]
}

export type GenericAPI = {
  [key: string]: any
}

export type ColPreference = {herdCode: string, subtype: string, columns: string[]}[]

export type PersonalDashboard = {subtype: string, list: string[]}

export type DropdownOpts = {label: string, value: string, hidden?: boolean}[]

export const eventFields = {
  Calving: {
    type: {
      A: "Aborted",
      CE: "Easy Pull",
      CH: "Hard Pull",
      CI: "Induced",
      CM: "Malrepresentation",
      CN: "No Assistance",
      CS: "Surgical"
    },
    sex: {
      F: "Female",
      M: "Male",
      FF: "Female twins",
      MM: "Male twins",
      FM: "One female & one male twin",
      U: "Undefined"
    },
    fate: {
      L: "Live",
      S: "Sold",
      D: "Dead",
      LL: "Live Twins",
      DD: "Dead Twins",
      SS: "Sold Twins",
      LD: "One Live & One Dead Twin",
      LS: "One Live & One Sold Twin",
      DS: "One Dead & One Sold Twin"
    },
    size: {
      H: "Huge",
      B: "Big",
      N: "Normal",
      S: "Small",
      T: "Tiny"
    }
  },
  Mating: {
    type: {
      MA: "Artificial",
      ME: "Embryo",
      MN : "Natural",
      MS: "Sexed"
    }
  },
  'Preg Test': {
    type: {
      PC: "Confirm Pregnant",
      PE: "Empty",
      PI: "In Calf",
      PR: "Recheck"
    }
  },
  Treatment: {
    type: {
      TA: "Mammary",
      TD: "Drench/Vaccine",
      TG: "General Injury",
      TH: "Hormones",
      TI: "Illness/Disease",
      TL: "Lame",
      // TLA: "Lame - Arthritis",
      // TLB: "Lame - Abscess",
      // TLD: "Lame - Dislocated Hip",
      // TLF: "Lame - Footrot",
      // TLH: "Lame - Hoof Trim",
      // TLR: "Lame - Bruise",
      // TLU: "Lame - Upper Leg",
      TM: "Mastitis",
      TP: "Paralysis",
      TU: "Uterine",
      // TUD: "Uterine - Discharge",
      // TUM: "Uterine - Metritis",
      // TUO: "Uterine - Ovarion Cyst",
      // TUP: "Uterine - Prolapse",
      // TUR: "Uterine - RFM"
    },
    reason: {
      TLA: "Arthritis",
      TLB: "Abscess",
      TLD: "Dislocated Hip",
      TLF: "Footrot",
      TLH: "Hoof Trim",
      TLR: "Bruise",
      TLU: "Upper Leg",
      TUD: "Discharge",
      TUM: "Metritis",
      TUO: "Ovarion Cyst",
      TUP: "Prolapse",
      TUR: "RFM"
    }
  },
  'Dry Off': {
    type: {
      D1: "Low Production",
      D2: "Disease or Injury",
      D3: "Other",
      D4: "End of Lactation",
      D5: "Aborted"
    }
  },
  Heat: {
    type: {
      H: "Heat Observed"
    }
  },
  Died: {
    type: {
      X1: "Milk Fever",
      X2: "Bloat",
      X3: "Other",
      X4: "EBL",
      X5: "Johnes Disease",
      X6: "Mastitis",
      X7: "Scours",
      X8: "Calving Difficulties",
      X9: "Paralysis",
      XA: "Accident"
    }
  },
  Sold: {
    type: {
      S1: "Low Production",
      S2: "Age",
      S3: "Mastitis",
      S4: "Infertility",
      S5: "Type Defect",
      S6: "Temperament",
      S7: "Easy of Milking",
      S8: "Sold for Dairying",
      S9: "Other"
    }
  },
  Flush: {
    type: {
      F: "Flush"
    }
  },
  'Vet Check': {
    type: {
      VN: "Needed",
      VO: "OK",
      VR: "Recheck"
    },
    reason: [
      "Assisted Calving",
      "No Visible Oestrus",
      "Preg Test Due",
      "Prolapse",
      "RFM",
      "Stillborn Calf",
      "Twins",
      "Unchecked"
    ]
  }
}

export type DefaultEvent = {
  eventUuid: string, 
  eventDate: string, 
  notes: string, 
}
export type CalvingEvent = DefaultEvent & {
  event: keyof typeof eventFields['Calving']['type'],
  calfId: number, 
  calfId2: number, 
  sireId: string, 
  sireNationalId: string, 
  calfSex: string, 
  calfFate: string, 
  calfSize: string, 
}

export type MatingEvent = DefaultEvent & {
  event: keyof typeof eventFields['Mating']['type'],
  sireId: string, 
  sireNationalId: string, 
  staffId?: string, 
  donorNationalId?: string,
  embryoRecovery?: string,
}

export type PregTestEvent = DefaultEvent & {
  event: keyof typeof eventFields['Preg Test']['type'],
  sireId: string, 
  sireNationalId: string, 
  staffId?: string, 
  conceptionDate?: string,
}

export type TreatmentEvent = DefaultEvent & {
  event: keyof typeof eventFields['Treatment']['type'],
  drugId: number,
  staffId: string,
  whMeat: number,
  whMilk: number,
  drugAmount: number,
  drugSession: number,
  diseaseId: number
}

export type DryOffEvent = DefaultEvent & {
  event: keyof typeof eventFields['Dry Off']['type'],
  drugId: number,
  staffId: string,
  whMeat: number,
  whMilk: number,
  drugAmount: number,
  drugSession: number
}

export type HeatEvent = DefaultEvent & {
  event: keyof typeof eventFields['Heat']['type'],
}

export type DiedEvent = DefaultEvent & {
  event: keyof typeof eventFields['Died']['type'],
}
export type SoldEvent = DefaultEvent & {
  event: keyof typeof eventFields['Sold']['type'],
}
export type FlushEvent = DefaultEvent & {
  event: keyof typeof eventFields['Flush']['type'],
}
export type VetCheckEvent = DefaultEvent & {
  event: keyof typeof eventFields['Vet Check']['type'],
  vetCheck: string
}

export type AllEvents = CalvingEvent | MatingEvent | PregTestEvent | TreatmentEvent | DryOffEvent | HeatEvent | DiedEvent | SoldEvent | FlushEvent | VetCheckEvent