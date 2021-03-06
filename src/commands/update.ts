import * as CI from 'ci-info';
import * as path from 'path';

import { download } from '../actions/download';
import { checkIfFileMissing, ensureDirectoryIsPresent, filenameOf } from '../actions/files';
import { conditionally } from '../actions/flow_control';
import { advise, complain, inform } from '../actions/logging';
import { defaults } from '../config';
import { adjustLogging } from '../logger';

export const command = 'update';

export const desc = 'Makes sure the Serenity BDD CLI jar file is available and up to date';

export const builder = {
    cacheDir: {
        default:   defaults.cacheDir,
        describe: 'An absolute or relative path to where the Serenity BDD CLI jar file should be stored',
    },
    ignoreSSL: {
        default:   false,
        describe: 'Ignore SSL certificates',
    },
    repository: {
        default:   defaults.repository,
        describe: 'Set the maven repository',
    },
    artifact: {
        default:   defaults.artifact,
        describe: `Serenity BDD CLI artifact to use; You're best off with the default option unless you want to experiment.`,
    },
    progress: {
        default:  ! CI.isCI,
        describe: 'Show the progress bar; Defaults to false on CI servers to avoid polluting the logs.',
    },
};

export const handler = (argv: any) =>
    adjustLogging(argv.log)
        .then(ensureDirectoryIsPresent(path.resolve(process.cwd(), argv.cacheDir)))
        .catch(complain('Couldn\'t create a cache directory. %s'))
        .then(downloadArtifactIfNeeded(argv.artifact, argv.repository, argv.ignoreSSL, argv.progress))
        .catch(complain('%s'));

// --

const downloadArtifactIfNeeded = (artifact: string, repository: string, ignoreSSL: boolean, showProgress: boolean) => (cacheDir: string) => {

    const
        filename = filenameOf(artifact),
        pathToCached = path.resolve(cacheDir, filename);

    return checkIfFileMissing(pathToCached)
        .catch(complain('Couldn\'t access the cache directory. %s'))
        .then(conditionally(
            inform('Looks like you need the latest Serenity BDD CLI jar. Let me download it for you...'),
            inform('Serenity BDD CLI jar file is up to date :-)'),
        ))
        .then(conditionally(() => download(artifact, cacheDir, ignoreSSL, showProgress, repository)))
        .then(conditionally(inform('Downloaded to %s')))
        .catch(advise('Looks like an error occurred downloading the Serenity BDD CLI jar. %s'));
};
