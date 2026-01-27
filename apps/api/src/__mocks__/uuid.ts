// Mock for uuid module to avoid ES module issues in Jest
export const v4 = () => '00000000-0000-0000-0000-000000000000';
export const v1 = () => '00000000-0000-0000-0000-000000000000';
export const v3 = () => '00000000-0000-0000-0000-000000000000';
export const v5 = () => '00000000-0000-0000-0000-000000000000';
export const NIL = '00000000-0000-0000-0000-000000000000';
export const validate = (uuid: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
export const version = (uuid: string) => 4;
export default { v4, v1, v3, v5, NIL, validate, version };
