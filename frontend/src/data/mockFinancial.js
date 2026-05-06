export const mockFinancial = {
  filters: {
    accountOptions: ["Global Account", "Conta LATAM"],
    businessManagerOptions: ["Main BM", "Secondary BM"],
    account: "Global Account",
    businessManager: "Main BM",
    periodOptions: ["Hoje", "Ontem", "7 dias", "30 dias"],
    activePeriod: "7 dias"
  },
  periods: {
    "Hoje": {
      metrics: {
        spendTotal: "R$ 4.980,12",
        cpm: "R$ 9,10",
        clicks: "28.410",
        impressions: "540.020",
        cpc: "R$ 0,39"
      },
      spendSeries: [
        { label: "08:00", value: 420 },
        { label: "10:00", value: 780 },
        { label: "12:00", value: 1120 },
        { label: "14:00", value: 980 },
        { label: "16:00", value: 760 },
        { label: "18:00", value: 920 },
        { label: "20:00", value: 1000 }
      ],
      tableRows: [
        {
          campaign: "DirigirBTN4",
          countryCode: "BR",
          country: "Brasil",
          spend: "R$ 1.420,50",
          impressions: "110.000",
          clicks: "5.600",
          cpc: "R$ 0,25",
          cpm: "R$ 12,91",
          status: "Ativo"
        },
        {
          campaign: "DirigirBTN4",
          countryCode: "US",
          country: "EUA",
          spend: "R$ 1.180,30",
          impressions: "96.000",
          clicks: "4.800",
          cpc: "R$ 0,25",
          cpm: "R$ 12,29",
          status: "Ativo"
        }
      ]
    },
    "Ontem": {
      metrics: {
        spendTotal: "R$ 6.240,44",
        cpm: "R$ 8,72",
        clicks: "36.920",
        impressions: "720.100",
        cpc: "R$ 0,36"
      },
      spendSeries: [
        { label: "17/4", value: 860 },
        { label: "18/4", value: 940 },
        { label: "19/4", value: 910 },
        { label: "20/4", value: 880 },
        { label: "21/4", value: 920 },
        { label: "22/4", value: 890 },
        { label: "23/4", value: 840 }
      ],
      tableRows: [
        {
          campaign: "DirigirBTN4",
          countryCode: "BR",
          country: "Brasil",
          spend: "R$ 1.850,50",
          impressions: "150.000",
          clicks: "7.500",
          cpc: "R$ 0,25",
          cpm: "R$ 12,33",
          status: "Ativo"
        },
        {
          campaign: "DirigirBTN4",
          countryCode: "ES",
          country: "Espanha",
          spend: "R$ 1.020,25",
          impressions: "132.748",
          clicks: "6.611",
          cpc: "R$ 0,15",
          cpm: "R$ 7,68",
          status: "Pausado"
        }
      ]
    },
    "7 dias": {
      metrics: {
        spendTotal: "R$ 35.902,08",
        cpm: "R$ 8,88",
        clicks: "208.811",
        impressions: "4.042.748",
        cpc: "R$ 0,41"
      },
      spendSeries: [
        { label: "17/4", value: 4100 },
        { label: "18/4", value: 4850 },
        { label: "19/4", value: 5050 },
        { label: "20/4", value: 4700 },
        { label: "21/4", value: 5250 },
        { label: "22/4", value: 5920 },
        { label: "23/4", value: 5850 }
      ],
      tableRows: [
        {
          campaign: "DirigirBTN4",
          countryCode: "BR",
          country: "Brasil",
          spend: "R$ 10.250,50",
          impressions: "850.000",
          clicks: "42.500",
          cpc: "R$ 0,24",
          cpm: "R$ 12,06",
          status: "Ativo"
        },
        {
          campaign: "DirigirBTN4",
          countryCode: "US",
          country: "EUA",
          spend: "R$ 8.420,30",
          impressions: "720.000",
          clicks: "36.000",
          cpc: "R$ 0,23",
          cpm: "R$ 11,69",
          status: "Ativo"
        },
        {
          campaign: "DirigirBTN4",
          countryCode: "MX",
          country: "México",
          spend: "R$ 5.680,75",
          impressions: "620.000",
          clicks: "31.000",
          cpc: "R$ 0,18",
          cpm: "R$ 9,16",
          status: "Ativo"
        },
        {
          campaign: "DirigirBTN4",
          countryCode: "AE",
          country: "Emirados",
          spend: "R$ 4.320,80",
          impressions: "480.000",
          clicks: "19.200",
          cpc: "R$ 0,23",
          cpm: "R$ 9,00",
          status: "Ativo"
        },
        {
          campaign: "DirigirBTN4",
          countryCode: "FR",
          country: "França",
          spend: "R$ 4.150,48",
          impressions: "510.000",
          clicks: "25.500",
          cpc: "R$ 0,16",
          cpm: "R$ 8,14",
          status: "Ativo"
        },
        {
          campaign: "DirigirBTN4",
          countryCode: "ES",
          country: "Espanha",
          spend: "R$ 3.080,25",
          impressions: "462.748",
          clicks: "24.611",
          cpc: "R$ 0,13",
          cpm: "R$ 6,66",
          status: "Pausado"
        }
      ]
    },
    "30 dias": {
      metrics: {
        spendTotal: "R$ 142.501,73",
        cpm: "R$ 9,02",
        clicks: "872.904",
        impressions: "16.902.120",
        cpc: "R$ 0,44"
      },
      spendSeries: [
        { label: "Sem 1", value: 31250 },
        { label: "Sem 2", value: 35920 },
        { label: "Sem 3", value: 34780 },
        { label: "Sem 4", value: 40551 }
      ],
      tableRows: [
        {
          campaign: "DirigirBTN4",
          countryCode: "BR",
          country: "Brasil",
          spend: "R$ 45.250,50",
          impressions: "3.850.000",
          clicks: "192.500",
          cpc: "R$ 0,24",
          cpm: "R$ 11,75",
          status: "Ativo"
        },
        {
          campaign: "DirigirBTN4",
          countryCode: "US",
          country: "EUA",
          spend: "R$ 38.420,30",
          impressions: "3.120.000",
          clicks: "156.000",
          cpc: "R$ 0,25",
          cpm: "R$ 12,31",
          status: "Ativo"
        }
      ]
    }
  }
};
