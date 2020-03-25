import { Context, ConfigFull } from '../types';
import Allow from '../Allow';
import { asyncForEach } from './utils';
import { PermissionsResponse } from '../PermissionsResponse';

const checkPermissions = async (
  permissions: Allow[],
  action: string,
  resource: string,
  context: Context | undefined,
  config: ConfigFull
) => {
  const response = new PermissionsResponse(action, resource, config, context);

  let allowFullAccess = false; // When at least one ability is allowed all fields without any condition
  let allowAllFields = false; // When at least one ability is allowed all fields

  /*
  |-----------------------------------------------------------------
  | Check permissions
  |-----------------------------------------------------------------
  | Pass over all permissions and collect fields, condition, meta
  |
  */
  await asyncForEach(permissions, async (ability: Allow) => {
    // When allowFullAccess os true and abortEarly is apply we can skip
    const skip = allowFullAccess && config.abortEarly;
    if (skip) return;

    // Skip when not Allowed by current ability
    if (!(await ability.isAllowed(action, resource, context))) return;

    // User Allowed by current ability
    response.setAllow(true);

    const meta = ability.getMeta();
    // Collect meta
    if (meta) response.pushMeta(meta);

    // Handle fields
    const hasFields = ability.hasFields();
    const hasConditions = ability.hasConditions();
    allowFullAccess = allowFullAccess || (!hasConditions && !hasFields);
    allowAllFields = allowAllFields || !hasFields;
    if (!allowFullAccess) response.updateFieldsAndConditions(ability);
  });

  /**
   * Summary
   */
  const isUserAllowed = response.isAllow();
  if (isUserAllowed) {
    if (allowFullAccess) response.onUserNotAllow();
  } else {
    response.onUserNotAllow();
  }

  return response.get();
};

export default checkPermissions;