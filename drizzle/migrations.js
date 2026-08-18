// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_serious_eternity.sql';
import m0001 from './0001_serious_yellowjacket.sql';
import m0002 from './0002_ambitious_makkari.sql';
import m0003 from './0003_puzzling_the_initiative.sql';
import m0004 from './0004_orphaned_entries_cleanup.sql';
import m0005 from './0005_prediction_snapshot_identity.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004,
m0005
    }
  }
  