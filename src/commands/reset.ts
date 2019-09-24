import { ParsedSettings, parseSettings, Settings } from "../settings";
import { withClient } from "../pg";
import { executeActions } from "../actions";
import { _migrate } from "./migrate";

export async function _reset(
  parsedSettings: ParsedSettings,
  shadow: boolean
): Promise<void> {
  const connectionString = shadow
    ? parsedSettings.shadowConnectionString
    : parsedSettings.connectionString;
  if (!connectionString) {
    throw new Error("Could not determine connection string for reset");
  }
  await withClient(
    parsedSettings.rootConnectionString,
    parsedSettings,
    async pgClient => {
      const databaseName = shadow
        ? parsedSettings.shadowDatabaseName
        : parsedSettings.databaseName;
      const databaseOwner = parsedSettings.databaseOwner;
      const logSuffix = shadow ? "[shadow]" : "";
      await pgClient.query(`DROP DATABASE IF EXISTS ${databaseName};`);
      // eslint-disable-next-line no-console
      console.log(
        `graphile-migrate${logSuffix}: dropped database '${databaseName}'`
      );
      await pgClient.query(
        `CREATE DATABASE ${databaseName} OWNER ${databaseOwner};`
      );
      await pgClient.query(
        `REVOKE ALL ON DATABASE ${databaseName} FROM PUBLIC;`
      );
      // eslint-disable-next-line no-console
      console.log(
        `graphile-migrate${logSuffix}: recreated database '${databaseName}'`
      );
    }
  );
  await executeActions(parsedSettings, shadow, parsedSettings.afterReset);
  await _migrate(parsedSettings, shadow);
}

export async function reset(settings: Settings, shadow = false): Promise<void> {
  const parsedSettings = await parseSettings(settings, shadow);
  return _reset(parsedSettings, shadow);
}
