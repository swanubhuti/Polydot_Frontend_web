import { clsx, type ClassValue } from 'clsx';
import moment from 'moment';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const tableTypes: {
  [key: string]: {
    filters: {
      label: string;
      name: string;
      type: string;
      subType?: boolean;
      classes?: string;
      defaultSearch?: string;
      options?: { label: string; value: string; display?: string[]; isDateField?: boolean;}[];
      placeholder?: string;
      selected?: string;
      count?: boolean;
    }[];
    columns: {
      label: string;
      name: string;
      link?: string;
      hide?: boolean;
      hideSort?: boolean;
      required?: boolean;
      classes?: string;
      emptyVal?: string;
      dateField?: string;
      formatUTC?: boolean;
      subType?: string;
      display?: string[];
      defaultSort?: string;
      mapper?: Record<string | number, any>
    }[];
    unit?: string
  };
} = {
  status: {
    filters: [
      {
        label: 'Groups',
        name: 'group',
        type: 'select',
        classes: 'min-w-[200px]',
        options: [{ label: 'All', value: '' }],
      },
      {
        label: '',
        placeholder: 'Search for...',
        classes: 'md:min-w-[260px]',
        name: 'search',
        type: 'search',
        defaultSearch: 'animalId',
        options: [
          { label: 'Cow ID', value: 'animalId' },
          { label: 'Name', value: 'name' },
          { label: 'National ID', value: 'nationalId' },
          { label: 'NLIS ID', value: 'nlisVisualId' },
          { label: 'NLIS RF', value: 'nlisElectronicId' },
          { label: 'Stud Name', value: 'studName' },
          { label: 'Herdbook', value: 'herdbook' },
          { label: 'Sire Bull ID', value: 'sireId' },
          { label: 'Dam Cow ID', value: 'damId' },
          { label: 'Tattoo', value: 'tattoo' },
          { label: 'Ear Tag', value: 'earTag' },
          { label: 'Date of Birth', value: 'dateOfBirth', display: ['dateOfBirth'], isDateField: true },
        ],
      },
      { label: 'Dead and Sold', name: 'deadstatus', type: 'checkbox' },
      { label: 'All Herds', name: 'allherds', type: 'checkbox' },
    ],
    columns: [
      {
        label: 'ID',
        name: 'animalId',
        link: '/dashboard/animal/{id}',
        required: true,
        display: [
          'In Milk',
          'Dry',
          'Heifers',
          'Yearlings',
          'Calves',
          'Not Joined 60 Days',
          'Not Cycling',
          'Fertility Problem Cows',
          'Empty 100 Days',
          'Preg Test Due',
          'Due To Cycle',
          'Clinical Mastitis Cases',
          'Vet Check Required',
          'Dead/Sold',
        ],
      },
      { label: 'Activity ID', name: 'activityId', hide: true },
      { label: 'Age In Months', name: 'ageInMonths', hide: true },
      {
        label: 'Animal Name',
        name: 'name',
        link: '/dashboard/animal/{id}',
        display: [
          'In Milk',
          'Dry',
          'Heifers',
          'Yearlings',
          'Calves',
          'Not Joined 60 Days',
          'Not Cycling',
          'Fertility Problem Cows',
          'Empty 100 Days',
          'Due To Cycle',
          'Clinical Mastitis Cases',
          'Vet Check Required',
          'Dead/Sold',
        ],
      },
      { label: 'Appendix', name: 'appendix', hide: true },
      { label: 'APR', name: 'apr', hide: true },
      { label: 'ASI', name: 'asi', hide: true },
      // { label: 'Award', name: 'award', hide: true },
      {
        label: 'Date of Birth',
        name: 'dateOfBirth',
        dateField: '{DD/MM/YYYY}',
        display: ['In Milk', 'Dry', 'Heifers', 'Yearlings', 'Calves'],
      },
      { label: 'Breed', name: 'breed', display: ['In Milk', 'Dry', 'Heifers', 'Yearlings', 'Calves', 'Dead/Sold'] },
      { label: 'Calving Code', name: 'calvingCode', hide: true },
      { label: 'Calving Date', name: 'calvingDate', hide: true, dateField: '{DD/MM/YYYY}' },
      { label: 'Calving Due Date', name: 'calvingDueDate', hide: true, dateField: '{DD/MM/YYYY}' },
      { label: 'Calving Due Days', name: 'calvingDueDays', hide: true },
      { label: 'Calving To Conception', name: 'calvingToConception', hide: true },
      { label: 'Condition Date', name: 'conditionDate', hide: true, dateField: '{DD/MM/YYYY}' },
      { label: 'Condition Score', name: 'conditionScore', hide: true },
      { label: 'Confirmed Pregnant', name: 'confirmPregnant', hide: true },
      // {label: "Cow ID", name: "cowId", hide: true},
      // {label: "Cow ID List", name: "cowIdList", hide: true},
      { label: 'Next Cycle Due', name: 'cycles', hide: true, display: ['Due To Cycle'] },
      { label: 'Days After Cycle', name: 'daysAfterCycle', hide: true },
      { label: 'Days Dry', name: 'daysDry', hide: true },
      { label: 'Days In Calf', name: 'daysInCalf', hide: true },
      {
        label: 'Status',
        name: 'status',
        display: [
          'In Milk',
          'Dry',
          'Heifers',
          'Yearlings',
          'Calves',
          'Clinical Mastitis Cases',
          'Vet Check Required',
          'Dead/Sold',
        ],
      },
      {
        label: 'Days In Milk',
        name: 'daysInMilk',
        hide: true,
        display: [
          'Not Joined 60 Days',
          'Not Cycling',
          'Empty 100 Days',
          'Fertility Problem Cows',
          'Clinical Mastitis Cases',
          'Vet Check Required',
        ],
      },
      { label: 'Donor Herd', name: 'donorHerd', hide: true },
      { label: 'Donor ID', name: 'donorId', hide: true },
      { label: 'Dry Off Date', name: 'dryOffDate', hide: true, dateField: '{DD/MM/YYYY}' },
      { label: 'Dry Off Due', name: 'dryOffDue', hide: true, dateField: '{DD/MM/YYYY}' },
      { label: 'Dry Off Due Days', name: 'dryOffDueDays', hide: true },
      { label: 'Heats', name: 'heats', hide: true },
      { label: 'Herdbook', name: 'herdbook', hide: true },
      { label: 'Lactation No', name: 'lactationNo', hide: true },
      { label: 'Last Cell Count', name: 'lastCellCount', hide: true, display: ['Clinical Mastitis Cases'] },
      { label: 'Last Litres', name: 'lastLitres', hide: true },
      { label: 'Matings', name: 'matings', hide: true, display: ['Empty 100 Days', 'Fertility Problem Cows'] },
      {
        label: 'Last Mating Date',
        name: 'lastMatingDate',
        hide: true,
        dateField: '{DD/MM/YYYY}',
        display: ['Empty 100 Days', 'Fertility Problem Cows'],
      },
      { label: 'Last Mating Sire ID', name: 'lastMatingSireId', hide: true, display: ['Preg Test Due'] },
      { label: 'Last Test Date', name: 'lastTestDate', hide: true, dateField: '{DD/MM/YYYY}', display: [] },
      { label: 'Last Test Solids', name: 'lastTestSolids', hide: true },
      { label: 'Mastitis Count', name: 'mastitisCount', hide: true, display: ['Clinical Mastitis Cases'] },
      { label: 'NLIS Electronic ID', name: 'nlisElectronicId', hide: true },
      { label: 'NLIS Visual ID', name: 'nlisVisualId', hide: true },
      { label: 'Peak Cell Count', name: 'peakCellCount', hide: true },
      { label: 'Purchase Date', name: 'purchaseDate', hide: true, dateField: '{DD/MM/YYYY}' },
      // {label: "Score", name: "score", hide: true},
      { label: 'Sire ID', name: 'sireId', hide: true, display: ['In Milk', 'Dry', 'Heifers', 'Yearlings', 'Calves'] },
      { label: 'Dam ID', name: 'damId', hide: true, display: ['In Milk', 'Dry', 'Heifers', 'Yearlings', 'Calves'] },
      { label: 'Stud Name', name: 'studName', hide: true },
      { label: 'Tattoo', name: 'tattoo', hide: true },
      { label: 'Termination Code', name: 'terminationCode', hide: true },
      { label: 'Termination Date', name: 'terminationDate', hide: true, dateField: '{DD/MM/YYYY}' },
      { label: 'User Status', name: 'userStatus', hide: true },
      { label: 'Weeks In Calf', name: 'weeksInCalf', hide: true, display: ['Preg Test Due', 'Vet Check Required'] },
      { label: 'WHMeat', name: 'whMeat', hide: true, dateField: '{DD/MM/YYYY}' },
      { label: 'WHMilk', name: 'whMilk', hide: true, dateField: '{DD/MM/YYYY}' },
      {
        label: 'Vet Check',
        name: 'vetCheck',
        hide: true,
        display: [
          'Empty 100 Days',
          'Fertility Problem Cows',
          'Not Joined 60 Days',
          'Not Cycling',
          'Vet Check Required',
        ],
      },
    ],
    unit: 'cows'
  },
  events: {
    filters: [],
    columns: [
      { label: 'Date', name: 'eventDate', dateField: '{DD/MM/YYYY}', defaultSort: 'desc' },
      { label: 'Description', name: 'eventDescription' },
      { label: 'Sire ID', name: 'sireId' },
      { label: 'Sex', name: 'calfSex' },
      { label: 'Fate', name: 'calfFate' },
      { label: 'Size', name: 'calfSize' },
      { label: 'Calf ID', name: 'calfId' },
      { label: 'Calf ID', name: 'calfId2' },
      { label: 'Notes', name: 'notes' },
    ],
  },
  lactation: {
    filters: [],
    columns: [
      { label: 'Calving Date', name: 'calvingDate', dateField: '{DD/MM/YYYY}', defaultSort: 'desc' },
      { label: 'Lactation', name: 'standardMilk' },
      { label: 'Milk', name: 'totalMilk' },
      { label: 'F%', name: 'fatPercentage' },
      { label: 'FKg', name: 'totalFatKg' },
      { label: 'P%', name: 'proteinPercentage' },
      { label: 'PKg', name: 'totalProteinKg' },
      { label: 'Term', name: 'terminationDate', dateField: '{DD/MM/YYYY}' },
    ],
  },
  production: {
    filters: [
      // {label: 'Start Date', name: 'start', type: 'datepicker', classes: "min-w-[200px]"},
      // {label: 'End Date', name: 'end', type: 'datepicker', classes: "min-w-[200px]"},
    ],
    columns: [
      { label: 'Date', name: 'testDate', dateField: '{DD/MM/YYYY}', defaultSort: 'desc' },
      { label: 'Milk', name: 'milk' },
      { label: 'Cell Count', name: 'cellCount' },
      { label: 'FKg', name: 'fatKg' },
      { label: 'PKg', name: 'proteinKg' },
      { label: 'F%', name: 'fatPercent' },
      { label: 'P%', name: 'proteinPercent' },
      { label: 'Altered', name: 'altered', dateField: '{DD/MM/YYYY}'},
      { label: 'Farm Test', name: 'farmTest'},
      { label: 'Test Day No', name: 'testDayNo'},
    ],
  },
  calendar: {
    filters: [],

    columns: [
      { label: 'ID', name: 'animalId', link: '/dashboard/animal/{id}', required: true },
      { label: 'Breed', name: 'breed', hide: true },
      { label: 'Calving Code', name: 'calvingCode', hide: true },
      { label: 'Calving Date', name: 'calvingDate', hide: true, dateField: '{DD/MM/YYYY}' },
      // cell count indicators
      { label: 'Condition Score', name: 'conditionScore', hide: true },
      { label: 'Animal Name', name: 'name', link: '/dashboard/animal/{id}' },
      { label: 'Status', name: 'status' },
      { label: 'Confirm', name: 'confirmedPregnant' },
      { label: 'Sexed', name: 'sexed' },
      { label: 'Due Dry Date', name: 'dueDryDate', dateField: '{DD/MM/YYYY}', hide: true, subType: 'dryOff' },
      //dam herd
      { label: 'Dam ID', name: 'damId', hide: true },
      //dam name
      { label: 'Date of Birth', name: 'dateOfBirth', hide: true, dateField: '{DD/MM/YYYY}' },
      { label: 'Days In Milk', name: 'dayInMilk', hide: true, dateField: '{DD/MM/YYYY}' },
      { label: 'Donor Herd', name: 'donorHerd', hide: true },
      //donor id
      //donor name
      {
        label: 'Expected Calving Date',
        name: 'expectedCalvingDate',
        dateField: '{DD/MM/YYYY}',
        hide: true,
        subType: 'calving',
      },
      { label: 'Lead Feed Date', name: 'leadFeedDate', dateField: '{DD/MM/YYYY}', hide: true, subType: 'leadFeeding' },
      //last test cell count
      //last test litres
      //lead feed date
      { label: 'Mastitis Count', name: 'mastitisCount', hide: true },
      { label: 'Mated Sire ID', name: 'matedSireId', hide: true },
      { label: 'Mated Sire Name', name: 'matedSireName', hide: true },
      { label: 'Peak Cell Count', name: 'peakCellCount', hide: true },
      { label: 'Sire ID', name: 'sireBullId' },
      { label: 'Sire Name', name: 'sireName', hide: true },
      { label: 'Stud Name', name: 'studName', hide: true },
      { label: 'User Status', name: 'userStatus', hide: true },
    ],
    unit: 'cows'
  },
  bulls: {
    filters: [],
    columns: [
      { label: 'Display Name', name: 'displayName', required: true },
      { label: 'Bull ID', name: 'bullId', link: '/dashboard/bulls/{id}', required: true },
      { label: 'Type', name: 'type' },
      { label: 'Name', name: 'name', link: '/dashboard/bulls/{id}' },
      { label: 'Breed', name: 'breed' },
      { label: 'Stock', name: 'stock' },
    ],
    unit: 'bulls'
  },
  bull_calvings_due: {
    filters: [],
    columns: [
      { label: 'Herd', name: 'herdCode', required: true },
      { label: 'ID', name: 'animalId', required: true },
      { label: 'Name', name: 'name', required: true },
      { label: 'Status', name: 'status', required: true },
      { label: 'Due', name: 'calvingDueDate', required: true, dateField: '{DD/MM/YYYY}' },
    ],
    unit: 'bulls'
  },
  bull_daughters: {
    filters: [],
    columns: [
      { label: 'Herd', name: 'herdCode', required: true },
      { label: 'ID', name: 'animalId', link: '/dashboard/animal/{id}', required: true },
      { label: 'Name', name: 'name', link: '/dashboard/animal/{id}', required: true },
      { label: 'DoB', name: 'dateOfBirth', dateField: '{DD/MM/YYYY}', required: true },
      { label: 'Breed', name: 'breed', required: true },
      { label: 'Status', name: 'status', required: true },
    ],
    unit: 'bulls'
  },
  drugstocks: {
    filters: [{
      label: 'Easy Dairy ID / Name',
      name: 'easyDairyId',
      type: 'select',
      classes: 'min-w-[200px]',
      options: [{ label: 'All', value: '' }],
    }],
    columns: [
      { label: 'Short Name', name: 'shortName' },
      { label: 'UOM', name: 'measure' },
      { label: 'WH Milk', name: 'whMilk' },
      { label: 'WH Meat', name: 'whMeat' },
    ],
    unit: 'drugs'
  },
  withholding_milk: {
    filters: [
      {
        label: 'Display',
        name: 'status',
        type: 'select',
        selected: '',
        classes: 'min-w-[120px]',
        options: [
          { label: 'All', value: '' },
          { label: 'In Milk', value: 'In Milk' },
          { label: 'Dry', value: 'Dry' },
        ],
      },
    ],
    columns: [
      { label: 'ID', name: 'animalId', link: '/dashboard/animal/{id}', required: true },
      { label: 'Name', name: 'name', link: '/dashboard/animal/{id}' },
      { label: 'Status', name: 'status' },
      { label: 'Stud Name', name: 'studName', hide: true },
      { label: 'Drug', name: 'milkDrug' },
      { label: 'Start', name: 'milkStart', dateField: '{DD/MM/YYYY}' },
      { label: 'Days', name: 'milkDaysRemain' },
      { label: 'Free', name: 'milkFree', dateField: '{DD/MM/YYYY}' },
      { label: 'Session', name: 'milkFreeSession' },
      { label: 'Drug Session', name: 'drugSession', hide: true },
    ],
    unit: 'cows'
  },
  withholding_meat: {
    filters: [
      {
        label: 'Display',
        name: 'status',
        type: 'select',
        classes: 'min-w-[120px]',
        selected: '',
        options: [
          { label: 'All', value: '' },
          { label: 'In Milk', value: 'In Milk' },
          { label: 'Dry', value: 'Dry' },
        ],
      },
    ],
    columns: [
      { label: 'ID', name: 'animalId', link: '/dashboard/animal/{id}', required: true },
      { label: 'Name', name: 'name', link: '/dashboard/animal/{id}' },
      { label: 'Status', name: 'status' },
      { label: 'Stud Name', name: 'studName', hide: true },
      { label: 'Drug', name: 'meatDrug' },
      { label: 'Start', name: 'meatStart', dateField: '{DD/MM/YYYY}' },
      { label: 'Days', name: 'meatDaysRemain' },
      { label: 'Free', name: 'meatFree', dateField: '{DD/MM/YYYY}' },
      { label: 'Session', name: 'milkFreeSession' },
      { label: 'Drug Session', name: 'drugSession', hide: true },
    ],
    unit: 'cows'
  },
  users: {
    filters: [
      { label: 'Role', name: 'role', type: 'select' },
      { label: 'Status', name: 'status', type: 'select' },
    ],
    columns: [
      { label: 'Username', name: '' },
      { label: 'First Name', name: '' },
      { label: 'Last Name', name: '' },
      { label: 'Email', name: '' },
      { label: 'Created At', name: '' },
      { label: 'Role', name: '' },
      { label: 'Status', name: '' },
    ],
  },
  herdTestAvg: {
    filters: [],
    columns: [
      { label: 'Herd', name: 'herdCode', hide: true },
      { label: 'Test Date', name: 'testDate', dateField: '{DD/MM/YYYY}', defaultSort: 'desc' },
      { label: 'Milk', name: 'milk' },
      { label: 'Total Cows', name: 'totalCows' },
      { label: 'Fresh Cows', name: 'freshCows' },
      { label: 'Terminated Cows', name: 'terminatedCows', hide: true },
      { label: 'Cell Counted Cows', name: 'cellCountedCows', hide: true },
      { label: 'Cell Count', name: 'cellCount' },
      { label: 'Protein Percent', name: 'proteinPercent' },
      { label: 'Fat Percent', name: 'fatPercent' },
    ],
    unit: 'tests'
  },
  liveweightsByAnimal: {
    filters: [],
    columns: [
      { label: 'Weight Date', name: 'weightDate', dateField: '{DD/MM/YYYY}' },
      { label: 'Weight', name: 'weight' },
      { label: 'Previous Weight Date', name: 'prevDate', dateField: '{DD/MM/YYYY}' },
      { label: 'Previous Weight', name: 'prevWeight' },
      { label: 'Age In Months', name: 'ageInMonths' },
      { label: 'Weight Gain', name: 'weightGain' },
    ],
    unit: 'records'
  },
  liveweightsByHerd: {
    filters: [
      {
        label: 'Search',
        placeholder: 'Search for',
        classes: 'min-w-[400px]',
        name: 'search',
        type: 'search',
        defaultSearch: 'animalName',
      },
    ],
    columns: [
      { label: 'HerdCode', name: 'herdCode', hide: true },
      { label: 'Animal Name', name: 'animalName' },
      { label: 'Herd Name', name: 'herdName', hide: true },
      { label: 'Weight Date', name: 'weightDate', dateField: '{DD/MM/YYYY}' },
      { label: 'Weight', name: 'weight' },
      { label: 'Previous Weight Date', name: 'prevDate', dateField: '{DD/MM/YYYY}' },
      { label: 'Previous Weight', name: 'prevWeight' },
      { label: 'Age In Months', name: 'ageInMonths' },
    ],
    unit: 'records'
  },
  liveweightLatestWeightGainByHerd: {
    filters: [
      {
        label: 'Search',
        placeholder: 'Search for',
        classes: 'min-w-[400px]',
        name: 'search',
        type: 'search',
        defaultSearch: 'animalName',
      },
    ],
    columns: [
      { label: 'HerdCode', name: 'herdCode', hide: true },
      { label: 'Animal Name', name: 'animalName' },
      { label: 'Herd Name', name: 'herdName', hide: true },
      { label: 'Latest Weight Date', name: 'weightDate', dateField: '{DD/MM/YYYY}' },
      { label: 'Latest Weight', name: 'weight' },
      { label: 'Prior Weight Date', name: 'prevDate', dateField: '{DD/MM/YYYY}' },
      { label: 'Prior Weight', name: 'prevWeight' },
      { label: 'Latest Weight Gain', name: 'latestWeightGain' },
      { label: 'Age In Months', name: 'ageInMonths' },
      { label: '# liveweight sessions', name: 'totalLiveWeightSessions', hide: true },
    ],
    unit: 'records'
  },
  liveweightAverageDailyWeightGainByAnimal: {
    filters: [],
    columns: [
      { label: 'Weight Date', name: 'weightDate', dateField: '{DD/MM/YYYY}' },
      { label: 'Weight', name: 'weight' },
      { label: 'Prior Weight Date', name: 'prevDate', dateField: '{DD/MM/YYYY}', hide: true },
      { label: 'Average Daily Weight Gain', name: 'avgDailyWeightGain' },
      { label: 'Days Difference', name: 'dateDaysDifference' },
      { label: 'Date Range', name: 'dateRangeString' },
    ],
  },
  liveweightLatestAverageDailyWeightGainByHerd: {
    filters: [
      {
        label: 'Search',
        placeholder: 'Search for',
        classes: 'min-w-[400px]',
        name: 'search',
        type: 'search',
        defaultSearch: 'animalName',
      },
    ],
    columns: [
      { label: 'HerdCode', name: 'herdCode', hide: true },
      { label: 'Animal Name', name: 'animalName' },
      { label: 'Herd Name', name: 'herdName', hide: true },
      { label: 'Weight Date', name: 'weightDate', dateField: '{DD/MM/YYYY}' },
      { label: 'Weight', name: 'weight' },
      { label: 'Prior Weight Date', name: 'prevDate', dateField: '{DD/MM/YYYY}' },
      { label: 'Prior Weight', name: 'prevWeight' },
      { label: 'Days Difference', name: 'dateDaysDifference' },
      { label: 'Average Daily Weight Gain', name: 'latestAvgDailyWeightGain' },
      { label: 'Age In Months', name: 'ageInMonths', hide: true },
      { label: '# liveweight sessions', name: 'totalLiveWeightSessions', hide: true },
    ],
    unit: 'records'
  },
  liveweightsHistoryByHerd: {
    filters: [],
    columns: [
      //{label: "Animal UUID", name: "animalUuid",hide: false},
      { label: 'Animal Name', name: 'animalName', hide: false },
      // liveweightsHistoryByHerd has columns that changes depends on user selection. Month(s) columns are added on demand instead of defining here
    ],
    unit: 'records'
  },
  animalTransferRecords: {
    filters: [],
    columns: [
      { label: 'Animal ID', name: 'animalId' },
      { label: 'National ID', name: 'nationalID', hide: true },
      { label: 'Event UUID', name: 'eventUuid', hide: true },
      { label: 'Animal UUID', name: 'animalUuid', hide: true },
      { label: 'Breed', name: 'breed' },
      { label: 'Event', name: 'event' },
      { label: 'Event Description', name: 'eventDescription' },
      { label: 'Event Date', name: 'eventDate', dateField: '{DD/MM/YYYY}' },
      { label: 'Gender', name: 'gender' },
      { label: 'Notes', name: 'notes' },
      { label: 'Transfer From', name: 'transferFrom' },
      { label: 'Transfer To', name: 'transferTo' },
      { label: 'Altered', name: 'altered', dateField: '{DD/MM/YYYY}', hide: true },
    ],
  },
  classifications: {
    filters: [],
    columns: [
      { label: 'Class Date', name: 'classDate', dateField: '{DD/MM/YYYY}' },
      { label: 'Total Score', name: 'totalScore' },
      { label: 'Angularity', name: 'angularity' },
      // { label: 'Award', name: 'award' },
      { label: 'Body Depth', name: 'bodyDepth' },
      { label: 'Body Length', name: 'bodyLength' },
      { label: 'Bone Quality', name: 'boneQuality' },
      { label: 'Centre Ligament', name: 'centreLigament' },
      { label: 'Chest Width', name: 'chestWidth' },
      { label: 'Foot Angle', name: 'footAngle' },
      { label: 'Fore Attachment', name: 'foreAttachment' },
      { label: 'Front End Height', name: 'frontEndHeight' },
      { label: 'Length', name: 'length' },
      { label: 'Loin Strength', name: 'loinStrength' },
      { label: 'Mammary System', name: 'mammarySystem' },
      { label: 'Muzzle Width', name: 'muzzleWidth' },
      { label: 'Overall Type', name: 'overallType' },
      { label: 'Pin Set', name: 'pinSet' },
      { label: 'Pin Width', name: 'pinWidth' },
      { label: 'Rear Attachment Height', name: 'rearAttachmentHeight' },
      { label: 'Rear Attachment Width', name: 'rearAttachmentWidth' },
      { label: 'Rear Leg Rear View', name: 'rearLegRearView' },
      { label: 'Rear Set', name: 'rearSet' },
      { label: 'Stature', name: 'stature' },
      { label: 'Teat Length', name: 'teatLength' },
      { label: 'Teat Placement Fore', name: 'teatPlacementFore' },
      { label: 'Teat Placement Rear', name: 'teatPlacementRear' },
      { label: 'Udder Depth', name: 'udderDepth' },
      { label: 'Udder Texture', name: 'udderTexture' },
    ],
  },
  abv: {
    filters: [
      {
        label: 'Search',
        placeholder: 'Search for',
        classes: 'min-w-[400px]',
        name: 'search',
        type: 'search',
        defaultSearch: 'breed',
      },
    ],
    columns: [
      { label: 'Animal ID', name: 'animalId', link: '/dashboard/animal/{id}', required: true },
      { label: 'Animal Name', name: 'name', hide: true },
      { label: 'Breed', name: 'breed' },
      { label: 'Status', name: 'status' },
      { label: 'ABV Date', name: 'abvDate', hide: true },
      { label: 'ASI', name: 'asi' },
      { label: 'Protein', name: 'protein', hide: true },
      { label: 'Protein Percent', name: 'proteinPercent', hide: true },
      { label: 'Milk', name: 'milk', hide: true },
      { label: 'Fat', name: 'fat', hide: true },
      { label: 'Fat Percent', name: 'fatPercent', hide: true },
      { label: 'Reliability', name: 'reliability' },
      { label: 'ASI Rank', name: 'asiRank', hide: true },
      { label: 'BPI', name: 'bpi' },
      { label: 'BPI Reliability', name: 'bpiReliability' },
      { label: 'ABV Milking Speed', name: 'abvMilkingSpeed', hide: true },
      { label: 'ABV Temperament', name: 'abvTemperament', hide: true },
      { label: 'ABV Likability', name: 'abvLikability', hide: true },
      { label: 'Reliability Workability', name: 'reliabilityWorkability', hide: true },
      { label: 'ABV Survival', name: 'abvSurvival', hide: true },
      { label: 'Reliability Survial', name: 'reliabilitySurvival', hide: true },
      { label: 'ABV Calving Ease', name: 'abvCalvingEase', hide: true },
      { label: 'Reliability Calving Easy', name: 'reliabilityCalvingEase', hide: true },
      { label: 'ABV Somatic Cell Count', name: 'abvSomaticCellCount', hide: true },
      { label: 'Reliability Cell Count', name: 'reliabilityCellCount', hide: true },
      { label: 'ABV Daughter Fertility', name: 'abvDaughterFertility', hide: true },
      { label: 'Reliability Daughter Fertility', name: 'relDaughterFertility', hide: true },
      { label: 'ABV Live Weight', name: 'abvLiveweight', hide: true },
      { label: 'Reliability Live Weight', name: 'reliabilityLiveweight', hide: true },
      { label: 'Health Weighted Index', name: 'healthWeightedIndex' },
      { label: 'Reliability HWI', name: 'reliabilityHwi' },
      { label: 'Type Weighted Index', name: 'typeWeightedIndex', hide: true },
      { label: 'Reliability TWI', name: 'reliabilityTwi', hide: true },
      { label: 'ABV Residual Survival', name: 'abvResidualSurvival', hide: true },
      { label: 'ABV Feed Efficiency', name: 'abvFeedEfficiency', hide: true },
    ],
    unit: 'scores'
  },
  workabilityByAnimal: {
    filters: [
      {
        label: 'Search',
        placeholder: 'Search for',
        classes: 'min-w-[400px]',
        name: 'search',
        type: 'search',
        defaultSearch: 'animalName',
      },
    ],
    columns: [
      //{label: "Animal ID", name: "animalUuid", hide: true},
      { label: 'Animal Name', name: 'animalName' },
      { label: 'Animal Status', name: 'animalStatus' },
      { label: 'Calving Date', name: 'calvingDate', dateField: '{DD/MM/YYYY}' },
      { label: 'Likability', name: 'likability' },
      { label: 'Temperament', name: 'temperament' },
      { label: 'Milking Speed', name: 'milkingSpeed' },
      { label: 'Lactation No.', name: 'lactationNo' },
      //{label: "Altered", name: "altered", hide: true}
    ],
    unit: 'records'
  },
  animalTransferPage: {
    filters: [
      //{label: "Search", placeholder:"Search for", classes: "min-w-[400px]", name: "search", type: "search", defaultSearch: 'name'}
    ],
    columns: [
      { label: 'UUID', name: 'animalUuid', hide: true },
      { label: 'ID', name: 'animalId', link: '/dashboard/animal/{id}', required: true },
      { label: 'Animal Name', name: 'name', link: '/dashboard/animal/{id}' },
      { label: 'Breed', name: 'breed' },
      { label: 'Status', name: 'status' },
      { label: 'Date of Birth', name: 'dateOfBirth', dateField: '{DD/MM/YYYY}' },
      { label: 'Transfer', name: 'transfer' },
    ],
  },
  animalPromotions: {
    filters: [
    ],
    columns: [
      {label: "Name", name: "name", link: '/dashboard/promotion/view/{id}'},
      {label: "Breed", name: "breed"},
      {label: "ID", name: "id", hide: true},
      // {label: "No. of Animals", name: "noOfAnimals"},
      {label: "Status", name: "status"},
      {label: 'Action', name: 'action', hideSort: true}
    ]
  },
  drafted: {
    filters: [
      {
        label: 'Search',
        placeholder: 'Animal ID',
        classes: 'md:min-w-[400px]',
        name: 'search',
        type: 'search',
        defaultSearch: 'animalId',
      },
      {
        label: 'Direction',
        name: 'direction',
        type: 'select',
        classes: 'md:min-w-[120px]',
        selected: '',
        options: [
          { label: 'All', value: '' },
          { label: 'Left', value: '0' },
          { label: 'Center', value: '1' },
          { label: 'Right', value: '2' },
        ],
      }
    ],
    columns: [
      {label: 'ID', name: 'animalId'},
      {label: 'Time', name: 'draftedDate', dateField: '{hh:mm:ss a}', formatUTC: true},
      {label: 'Direction', name: 'direction', mapper: {0: 'Left', 1: 'Center', 2: 'Right'}},
      {label: 'Reason', name: 'reason'}
    ]
  },
  currentDraft: {
    filters: [
      {
        label: 'Search',
        placeholder: 'Animal ID',
        classes: 'md:min-w-[400px]',
        name: 'search',
        type: 'search',
        defaultSearch: 'animalId',
      },
      {
        label: 'Direction',
        name: 'direction',
        type: 'select',
        classes: 'md:min-w-[120px]',
        selected: '',
        options: [
          { label: 'All', value: '' },
          { label: 'Left', value: '0' },
          { label: 'Right', value: '2' },
        ],
      }
    ],
    columns: [
      {label: 'ID', name: 'animalId'},
      {label: 'Name', name: 'name'},
      {label: 'Direction', name: 'direction', mapper: {0: 'Left', 2: 'Right'}},
      {label: 'Reason', name: 'reason'}
    ]
  },
  nextDraft: {
    filters: [
      {
        label: 'Search',
        placeholder: 'Animal ID',
        classes: 'md:min-w-[400px]',
        name: 'search',
        type: 'search',
        defaultSearch: 'animalId',
      },
      {
        label: 'Direction',
        name: 'direction',
        type: 'select',
        classes: 'md:min-w-[120px]',
        selected: '',
        options: [
          { label: 'All', value: '' },
          { label: 'Left', value: '0' },
          { label: 'Right', value: '2' },
        ],
      }
    ],
    columns: [
      {label: 'ID', name: 'animalId'},
      {label: 'Name', name: 'name'},
      {label: 'Direction', name: 'direction', mapper: {0: 'Left', 2: 'Right'}},
      {label: 'Reason', name: 'reason'}
    ]
  },
  draftCows: {
    filters: [
      {
        label: 'Search',
        placeholder: 'Animal ID',
        classes: 'md:min-w-[400px]',
        name: 'search',
        type: 'search',
        defaultSearch: 'animalId',
      },
      {
        label: 'Direction',
        name: 'direction',
        type: 'select',
        classes: 'md:min-w-[120px]',
        selected: '',
        options: [
          { label: 'All', value: '' },
          { label: 'Left', value: '0' },
          { label: 'Center', value: '1' },
          { label: 'Right', value: '2' },
        ],
      }
    ],
    columns: [
      {label: 'ID', name: 'animalId'},
      {label: 'Name', name: 'name'},
      {label: 'RFID', name: 'rfid'},
      {label: 'Direction', name: 'direction', mapper: {0: 'Left', 1: 'Center', 2: 'Right'}},
      {label: 'Reason', name: 'reason'}
    ]
  },
  'heat-CowManager': {
    filters: [],
    columns: [
      { label: 'Animal ID', name: 'animalId' },
      { label: 'Alert Date/Time', name: 'alertDateTime', dateField: '{DD/MM/YYYY, hh:mm:ss a}', formatUTC: true},
      { label: 'Heat Date/Time', name: 'heatDateTime', dateField: '{DD/MM/YYYY, hh:mm:ss a}', formatUTC: true},
      { label: 'Heat Duration', name: 'heatDuration', hide: true },
      { label: 'Heat Value', name: 'heatValue' },
      { label: 'Heat Max Value', name: 'heatMaxValue', hide: true },
      { label: 'Heat Level', name: 'heatLevel', hide: true },
      { label: 'Heat Alert Level', name: 'heatAlertLevel', hide: true },
      { label: 'Health Date/Time', name: 'healthDateTime', dateField: '{DD/MM/YYYY, hh:mm:ss a}', hide: true, formatUTC: true},
      { label: 'Health Duration', name: 'healthDuration', hide: true },
      { label: 'Health Level', name: 'healthLevel', hide: true },
      { label: 'Health Alert Level', name: 'healthAlertLevel', hide: true },
      { label: 'Temperature', name: 'temperature', hide: true },
    ],
  },
  'heat-Datamars': {
    filters: [],
    columns: [
      { label: 'Animal ID', name: 'animalId' },
      { label: 'Created Date/Time', name: 'createdDateTime', dateField: '{DD/MM/YYYY, hh:mm:ss a}', formatUTC: true},
      { label: 'Start Date/Time', name: 'startDateTime', dateField: '{DD/MM/YYYY, hh:mm:ss a}', formatUTC: true},
      { label: 'End Date/Time', name: 'endDateTime', hide: true, dateField: '{DD/MM/YYYY, hh:mm:ss a}', formatUTC: true},
      { label: 'Alert Status', name: 'alertStatus', hide: true},
      { label: 'Alert Type', name: 'alertType', hide: true}
    ],
  },
  'heat-Halter': {
    filters: [],
    columns: [
      { label: 'Animal ID', name: 'animalId' },
      { label: 'Heat Updated', name: 'heatUpdated', dateField: '{DD/MM/YYYY, hh:mm:ss a}', formatUTC: true},
      { label: 'Mating Window', name: 'matingWindow'},
      { label: 'On Heat', name: 'onHeat', hide: true},
      { label: 'Recovering Poorly', name: 'recoveringPoorly', hide: true},
      { label: 'Calving Recovery Updated', name: 'calvingRecoveryUpdated', hide: true}
    ],
  },
  'heat-HeatTime': {
    filters: [],
    columns: [
      { label: 'Animal ID', name: 'animalId' },
      { label: 'Heat Time', name: 'heatTime', dateField: '{DD/MM/YYYY, hh:mm:ss a}', formatUTC: true},
      { label: 'Heat Peak', name: 'heatPeak', dateField: '{DD/MM/YYYY, hh:mm:ss a}', formatUTC: true},
      { label: 'Peak Height', name: 'peakHeight', hide: true},
      { label: 'Time to AI', name: 'timeToAi', dateField: '{DD/MM/YYYY, hh:mm:ss a}', formatUTC: true, hide: true},
      { label: 'Hours to AI', name: 'hoursToAi', hide: true},
      { label: 'Heat Index', name: 'heatIndex', hide: true}
    ],
  },
  'heat-Nedap': {
    filters: [],
    columns: [
      { label: 'Animal ID', name: 'animalId' },
      { label: 'Attention Time', name: 'attentionTime', dateField: '{DD/MM/YYYY, hh:mm:ss a}', formatUTC: true},
      { label: 'Attention Type', name: 'attentionType'},
      { label: 'Insem Start Time', name: 'insemStartTime', dateField: '{DD/MM/YYYY, hh:mm:ss a}', formatUTC: true, hide: true},
      { label: 'Insem End Time', name: 'insemEndTime', dateField: '{DD/MM/YYYY, hh:mm:ss a}', formatUTC: true, hide: true},
    ],
  },
  'heat-smaXtec': {
    filters: [],
    columns: [
      { label: 'Animal ID', name: 'animalId' },
      { label: 'Heat Date/Time', name: 'heatDateTime', dateField: '{DD/MM/YYYY, hh:mm:ss a}', formatUTC: true},
      { label: 'Window Start Date/Time', name: 'windowStartDateTime', dateField: '{DD/MM/YYYY, hh:mm:ss a}', formatUTC: true},
      { label: 'Window End Date/Time', name: 'windowEndDateTime', dateField: '{DD/MM/YYYY, hh:mm:ss a}', formatUTC: true, hide: true},
      { label: 'Calving Detection Date/Time', name: 'calvingDetectionDateTime', dateField: '{DD/MM/YYYY, hh:mm:ss a}', formatUTC: true, hide: true},
      { label: 'Temp Date/Time', name: 'tempDateTime', dateField: '{DD/MM/YYYY, hh:mm:ss a}', formatUTC: true, hide: true},
      { label: 'Temp Type', name: 'tempType', hide: true},
      { label: 'Drinking Date/Time', name: 'drinkingDateTime', dateField: '{DD/MM/YYYY, hh:mm:ss a}', formatUTC: true, hide: true},
      { label: 'Drinking Type', name: 'drinkingType', hide: true},
      { label: 'Feeding Date/Time', name: 'feedingDateTime', dateField: '{DD/MM/YYYY, hh:mm:ss a}', formatUTC: true, hide: true},
      { label: 'Feeding Type', name: 'feedingType', hide: true}
    ],
  },
  'event-calving': {
    filters: [],
    columns: [
      // { label: 'ID', name: 'animalId', link: '/dashboard/animal/{id}' },
      { label: 'Event', name: 'eventDescription'},
      { label: 'Date', name: 'eventDate', dateField: '{DD/MM/YYYY}', defaultSort: 'desc'},
      { label: 'Sire', name: 'sireId'},
      { label: 'Calf Sex', name: 'calfSex'},
      { label: 'Calf Fate', name: 'calfFate'},
      { label: 'Calf Size', name: 'calfSize'},
      { label: 'Calf ID', name: 'calfId'},
      { label: 'Calf ID 2', name: 'calfId2'},
      { label: 'Notes', name: 'notes'}
    ]
  },
  'event-dryoff': {
    filters: [],
    columns: [
      // { label: 'ID', name: 'animalId', link: '/dashboard/animal/{id}' },
      { label: 'Event', name: 'eventDescription'},
      { label: 'Date', name: 'eventDate', dateField: '{DD/MM/YYYY}', defaultSort: 'desc'},
      { label: 'Notes', name: 'notes'},
      { label: 'Drug', name: 'drugName'},
      { label: 'Amount', name: 'drugAmount'},
      { label: 'Staff', name: 'staffId'},
    ]
  },
  'event-flush': {
    filters: [],
    columns: [
      // { label: 'ID', name: 'animalId', link: '/dashboard/animal/{id}' },
      { label: 'Event', name: 'eventDescription'},
      { label: 'Date', name: 'eventDate', dateField: '{DD/MM/YYYY}', defaultSort: 'desc'},
      { label: 'Notes', name: 'notes'}
    ]
  },
  'event-heat': {
    filters: [],
    columns: [
      // { label: 'ID', name: 'animalId', link: '/dashboard/animal/{id}' },
      { label: 'Event', name: 'eventDescription'},
      { label: 'Date', name: 'eventDate', dateField: '{DD/MM/YYYY}', defaultSort: 'desc'},
      { label: 'Notes', name: 'notes'}
    ]
  },
  'event-mating': {
    filters: [],
    columns: [
      // { label: 'ID', name: 'animalId', link: '/dashboard/animal/{id}' },
      { label: 'Event', name: 'eventDescription'},
      { label: 'Date', name: 'eventDate', dateField: '{DD/MM/YYYY}', defaultSort: 'desc'},
      { label: 'Sire', name: 'sireId'},
      { label: 'Notes', name: 'notes'}
    ]
  },
  'event-pregtest': {
    filters: [],
    columns: [
      // { label: 'ID', name: 'animalId', link: '/dashboard/animal/{id}' },
      { label: 'Event', name: 'eventDescription'},
      { label: 'Date', name: 'eventDate', dateField: '{DD/MM/YYYY}', defaultSort: 'desc'},
      { label: 'Sire', name: 'sireId'},
      { label: 'Conception Date', name: 'conceptionDate', dateField: '{DD/MM/YYYY}'},
      { label: 'Notes', name: 'notes'}
    ]
  },
  'event-sold': {
    filters: [],
    columns: [
      // { label: 'ID', name: 'animalId', link: '/dashboard/animal/{id}' },
      { label: 'Event', name: 'eventDescription'},
      { label: 'Date', name: 'eventDate', dateField: '{DD/MM/YYYY}', defaultSort: 'desc'},
      { label: 'Notes', name: 'notes'}
    ]
  },
  'event-treatment': {
    filters: [],
    columns: [
      // { label: 'ID', name: 'animalId', link: '/dashboard/animal/{id}' },
      { label: 'Event', name: 'eventDescription'},
      { label: 'Date', name: 'eventDate', dateField: '{DD/MM/YYYY}', defaultSort: 'desc'},
      { label: 'Drug', name: 'drugName'},
      { label: 'Amount', name: 'drugAmount'},
      { label: 'Staff', name: 'staffId'},
      { label: 'Notes', name: 'notes'}
    ]
  },
  'event-died': {
    filters: [],
    columns: [
      // { label: 'ID', name: 'animalId', link: '/dashboard/animal/{id}' },
      { label: 'Event', name: 'eventDescription'},
      { label: 'Date', name: 'eventDate', dateField: '{DD/MM/YYYY}', defaultSort: 'desc'},
      { label: 'Notes', name: 'notes'}
    ]
  },
  'event-vetcheck': {
    filters: [],
    columns: [
      // { label: 'ID', name: 'animalId', link: '/dashboard/animal/{id}' },
      { label: 'Event', name: 'eventDescription'},
      { label: 'Date', name: 'eventDate', dateField: '{DD/MM/YYYY}', defaultSort: 'desc'},
      { label: 'Vet Check', name: 'vetCheck'},
      { label: 'Notes', name: 'notes'}
    ]
  },
  'event-transfer': {
    filters: [],
    columns: [
      // { label: 'ID', name: 'animalId', link: '/dashboard/animal/{id}' },
      { label: 'Event', name: 'eventDescription'},
      { label: 'Date', name: 'eventDate', dateField: '{DD/MM/YYYY}', defaultSort: 'desc'},
      { label: 'From', name: 'transferFrom'},
      { label: 'To', name: 'transferTo'},
      { label: 'Notes', name: 'notes'}
    ]
  },
  'event-conditionscore': {
    filters: [],
    columns: [
      // { label: 'ID', name: 'animalId', link: '/dashboard/animal/{id}' },
      { label: 'Event', name: 'eventDescription'},
      { label: 'Date', name: 'eventDate', dateField: '{DD/MM/YYYY}', defaultSort: 'desc'},
      { label: 'Score', name: 'condition'},
      { label: 'Notes', name: 'notes'}
    ]
  },
  'event-view': {
    filters: [],
    columns: [
      { label: 'Date', name: 'eventDate', dateField: '{DD/MM/YYYY}', defaultSort: 'desc' },
      { label: 'Code', name: 'event' },
      { label: 'Description', name: 'eventDescription' },
      { label: 'Sire ID', name: 'sireId' },
      { label: 'Sex', name: 'calfSex' },
      { label: 'Fate', name: 'calfFate' },
      { label: 'Size', name: 'calfSize' },
      { label: 'Calf ID', name: 'calfId' },
      { label: 'Calf ID', name: 'calfId2' },
      { label: 'Notes', name: 'notes' },
    ],
  },
  'herdTransfer': {
    filters: [
      {
        label: 'Groups',
        name: 'group',
        type: 'select',
        classes: 'min-w-[200px]',
        options: [{ label: 'All', value: '' }],
      }
    ],
    columns: [
      {label: 'Animal ID', name: 'animalId'},
      {label: 'From', name: 'herdFromCode'},
      {label: 'To', name: 'herdCodeTo'},
      {label: 'Date', name: 'transferDate', dateField: '{DD/MM/YYYY}', defaultSort: 'desc'}
    ]
  },
  reproduction: {
    filters: [
      {
        label: '',
        placeholder: 'Search for...',
        classes: 'md:min-w-[260px]',
        name: 'search',
        type: 'search',
        defaultSearch: 'animalId',
        options: [
          { label: 'Animal ID', value: 'animalId' },
          { label: 'Name', value: 'name' },
          { label: 'National ID', value: 'nationalId' },
          { label: 'NLIS RF', value: 'nlisElectronicId' },
        ],
      },
      {
        label: 'Date of Birth',
        name: 'dateOfBirth',
        type: 'dateRange',
        classes: 'min-w-[200px]',
        // options: [{ label: 'All', value: '' }],
      },
      // { label: 'Dead and Sold', name: 'deadstatus', type: 'checkbox' },
      // { label: 'All Herds', name: 'allherds', type: 'checkbox' },
    ],
    columns: [
      {
        label: 'ID',
        name: 'animalId',
        link: '/admin/reproduction/{id}',
        required: true,
      },
      {
        label: 'Animal Name',
        name: 'name',
        link: '/admin/reproduction/{id}',
      },
      {
        label: 'National ID',
        name: 'nationalId'
      },
      {
        label: 'Date of Birth',
        name: 'dateOfBirth',
        dateField: '{DD/MM/YYYY}',
        // display: ['In Milk', 'Dry', 'Heifers', 'Yearlings', 'Calves'],
      },
      { label: 'Breed', name: 'breed'},
      
      { label: 'NLISRF', name: 'nlisElectronicId' },
      // { label: 'NLIS Visual ID', name: 'nlisVisualId', hide: true },
      { label: 'Sire ID', name: 'sireId' },
      { label: 'Dam ID', name: 'damId' },
    ],
    unit: 'cows'
  },
  duplicates: {
    filters: [
      {
        label: '',
        placeholder: 'Search for...',
        classes: 'md:min-w-[260px]',
        name: 'search',
        type: 'search',
        defaultSearch: 'nlisrf',
        options: [
          { label: 'RFID', value: 'nlisrf' },
          { label: 'Animal UUID', value: 'animalUuid' },
          { label: 'Herd UUID', value: 'herdUuid' },
          { label: 'Herd Code', value: 'herdCode' },
          { label: 'Easy Dairy ID', value: 'easyDairyId' },
        ],
      },
    ],
    columns: [
      {
        label: 'RFID',
        name: 'nlisrf',
        defaultSort: 'asc'
      },
      {
        label: 'Animal UUID',
        name: 'animalUuid',
      },
      {
        label: 'Herd UUID',
        name: 'herdUuid'
      },
      {
        label: 'Herd Code',
        name: 'herdCode',
      },
      { label: 'Easy Dairy ID', name: 'easyDairyId'},
    ],
  }
}

export function formatNumber(num:number, digits: number) {
  const lookup = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: "k" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "G" },
    { value: 1e12, symbol: "T" },
    { value: 1e15, symbol: "P" },
    { value: 1e18, symbol: "E" }
  ];
  const regexp = /\.0+$|(?<=\.[0-9]*[1-9])0+$/;
  const item = lookup.slice().reverse().find(e => num >= e.value);
  return item ? (num / item.value).toFixed(digits).replace(regexp, "").concat(" " + item.symbol) : "0";
}

export const formatDate = (value: string, dateFormat?: string) => {
  let date = new Date(value);
  //@ts-ignore
  if (isNaN(date)) {
    return '';
  }
  let now = moment();
  let diff = moment.duration(now.diff(date));
  let diffDays = moment(now).diff(date, 'days');

  dateFormat = dateFormat?.replace(/\{([^}]+)\}/g, (match, capture) => {
    // 1. Replace substring format inside {} with converted date through moment js
    let val = moment(date.toISOString()).format(capture);
    return val;
  });

  // 2. Replace substring [d] with date diff
  dateFormat = dateFormat?.replace(/\[d\]/g, diffDays.toString());
  // 2.5 Replace substring [-d] with date diff from now to given date
  dateFormat = dateFormat?.replace(/\[-d\]/g, (diffDays * -1).toString());

  // 3. Replace substring [m] with month diff
  dateFormat = dateFormat?.replace(/\[m\]/g, diff.months().toString());

  // 4. Replace substring [y] with year diff
  dateFormat = dateFormat?.replace(/\[y\]/g, diff.years().toString());

  return dateFormat;
};

export const getLocalStore = <T = object>(name: string) => {
  const item = localStorage.getItem(`__ed_${name.replace(/\s/g, '_')}`);
  return item ? (JSON.parse(item) as T) : undefined;
};

export const storeLocal = (name: string, data: any) => {
  const prefixedName = `__ed_${name.replace(/\s/g, '_')}`;
  localStorage.setItem(prefixedName, JSON.stringify(data));
};

export const removeLocal = (name: string) => {
  const prefixedName = `__ed_${name.replace(/\s/g, '_')}`;
  localStorage.removeItem(prefixedName);
}

/**
 *
 * @returns empty string if not conditions don't apply
 */
export const getVisibleHerdsFilter = (user?: { Role: string; Herds: string[] | null }) => {
  let result = '';
  if ((user?.Role === 'user' || user?.Role === 'business-admin') && user?.Herds) {
    result = `filter: { herdUuid: { in: ${JSON.stringify(user.Herds)} } herdCode: {notEqualTo: "UNIVERSAL"} purged: {equalTo: false} }`;
  } else {
    result = `filter: { herdCode: {notEqualTo: "UNIVERSAL"} purged: {equalTo: false} }`
  }
  return result;
};

export const colors = [
  '#bc4749',
  '#a7c957',
  '#8ECAE6',
  '#219EBC',
  '#023047',
  '#613dc1',
  '#6a994e',
  '#FFB703',
  '#e63946',
  '#FB8500',
  '#386641',
  '#9b5de5',
  '#f15bb5',
  '#8a5a44',
  '#00a6fb',
  '#ff595e',
];

export const HEAT_SYSTEM_LIST = [
  {
    value: false,
    label: 'CowManager',
  },
  {
    value: false,
    label: 'Datamars',
  },
  {
    value: false,
    label: 'Halter',
  },
  {
    value: false,
    label: 'HeatTime',
  },
  {
    value: false,
    label: 'Nedap',
  },
  {
    value: false,
    label: 'smaXtec',
  },
];

export const convertTz = (dateString: string, endDay?: boolean) => {
  const chosenDate = new Date(dateString)
  if (endDay) {
    chosenDate.setHours(chosenDate.getHours() + 24)
    chosenDate.setSeconds(chosenDate.getSeconds() - 1)
  }
  const tzOffset = chosenDate.getTimezoneOffset()
  const adjusted = chosenDate.valueOf() + (tzOffset * 60000)
  return new Date(adjusted)
}
