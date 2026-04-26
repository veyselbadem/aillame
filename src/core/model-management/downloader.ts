import { getModel } from '@core/models/registry';
import { getModelInstallStatus } from './status';
import { getScriptPath, parsePythonJson, runPythonScript } from './python-runner';

export type InstallModelResult = {
  status: 'installed' | 'built-in';
  modelId: string;
  repoId?: string;
  path?: string;
  message: string;
};

export async function installManagedModel(modelId: string): Promise<InstallModelResult> {
  const model = getModel(modelId);
  const current = getModelInstallStatus(modelId);

  if (model.builtIn) {
    return {
      status: 'built-in',
      modelId,
      message: `${model.label} is bundled with Aillame.`,
    };
  }

  if (!model.repoId) {
    throw new Error(`${model.label} has no downloadable repository configured.`);
  }

  if (current.installed && current.cachePath) {
    return {
      status: 'installed',
      modelId,
      repoId: model.repoId,
      path: current.cachePath,
      message: `${model.label} is already installed.`,
    };
  }

  const result = await runPythonScript(
    getScriptPath('model-management', 'scripts', 'download_model.py'),
    ['--repo-id', model.repoId, '--model-id', model.id],
    undefined,
    60 * 60 * 1000
  );

  return parsePythonJson<InstallModelResult>(result);
}
