const fs = require('fs');
const path = require('path');

// Fix the WAHA controller
const controllerPath = path.join(__dirname, 'src/backend/src/api/controllers/wahaController.ts');
let controllerContent = fs.readFileSync(controllerPath, 'utf8');

// Replace the getMessages function in the controller
const oldGetMessages = `export const getMessages = async (req: Request, res: Response) => {
  try {
    // Support both URL param and query param for chatId
    const chatId = req.params.chatId || req.query.chatId as string;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const wahaService = getWAHAService();
    
    if (!chatId) {`;

const newGetMessages = `export const getMessages = async (req: Request, res: Response) => {
  try {
    // Support both URL param and query param for chatId
    let chatId = req.params.chatId || req.query.chatId;
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Validate and sanitize chatId to prevent [object Object] errors
    if (chatId) {
      // Check if chatId is an object (shouldn't happen but defensive coding)
      if (typeof chatId === 'object') {
        console.error('[WAHA Controller] ❌ chatId is an object:', chatId);
        if ('id' in chatId) {
          chatId = (chatId as any).id;
        } else if ('_id' in chatId) {
          chatId = (chatId as any)._id;
        } else {
          return res.status(400).json({
            success: false,
            error: 'Invalid chatId format',
            details: { receivedType: typeof chatId }
          });
        }
      }
      
      // Convert to string if needed
      chatId = String(chatId);
      
      // Check for literal "[object Object]" string
      if (chatId === '[object Object]' || chatId.includes('[object')) {
        console.error('[WAHA Controller] ❌ Invalid chatId "[object Object]" detected');
        return res.status(400).json({
          success: false,
          error: 'Invalid chatId received',
          details: { chatId, hint: 'Frontend sent an object instead of string' }
        });
      }
    }
    
    const wahaService = getWAHAService();
    
    if (!chatId) {`;

// Handle different line endings
controllerContent = controllerContent.replace(/\r\n/g, '\n');
const oldGetMessagesNormalized = oldGetMessages.replace(/\r\n/g, '\n');
const newGetMessagesNormalized = newGetMessages.replace(/\r\n/g, '\n');

if (controllerContent.includes(oldGetMessagesNormalized)) {
  controllerContent = controllerContent.replace(oldGetMessagesNormalized, newGetMessagesNormalized);
  // Convert back to Windows line endings
  controllerContent = controllerContent.replace(/\n/g, '\r\n');
  fs.writeFileSync(controllerPath, controllerContent);
  console.log('✅ Fixed wahaController.ts');
} else {
  console.log('⚠️ Could not find exact match in wahaController.ts, attempting partial fix...');
  
  // Try to find and replace just the critical lines
  const simpleReplace = [
    ['const chatId = req.params.chatId || req.query.chatId as string;', 
     'let chatId = req.params.chatId || req.query.chatId;'],
  ];
  
  simpleReplace.forEach(([oldStr, newStr]) => {
    if (controllerContent.includes(oldStr)) {
      controllerContent = controllerContent.replace(oldStr, newStr);
      console.log(`  ✅ Replaced: ${oldStr.substring(0, 50)}...`);
    }
  });
  
  // Add validation after the chatId declaration
  const insertAfter = 'const limit = parseInt(req.query.limit as string) || 50;';
  const validation = `
    
    // Validate and sanitize chatId to prevent [object Object] errors
    if (chatId) {
      // Check if chatId is an object (shouldn't happen but defensive coding)
      if (typeof chatId === 'object') {
        console.error('[WAHA Controller] ❌ chatId is an object:', chatId);
        if ('id' in chatId) {
          chatId = (chatId as any).id;
        } else if ('_id' in chatId) {
          chatId = (chatId as any)._id;
        } else {
          return res.status(400).json({
            success: false,
            error: 'Invalid chatId format',
            details: { receivedType: typeof chatId }
          });
        }
      }
      
      // Convert to string if needed
      chatId = String(chatId);
      
      // Check for literal "[object Object]" string
      if (chatId === '[object Object]' || chatId.includes('[object')) {
        console.error('[WAHA Controller] ❌ Invalid chatId "[object Object]" detected');
        return res.status(400).json({
          success: false,
          error: 'Invalid chatId received',
          details: { chatId, hint: 'Frontend sent an object instead of string' }
        });
      }
    }`;
  
  if (controllerContent.includes(insertAfter) && !controllerContent.includes('Validate and sanitize chatId')) {
    controllerContent = controllerContent.replace(insertAfter, insertAfter + validation.replace(/\n/g, '\r\n'));
    console.log('  ✅ Added validation code');
  }
  
  fs.writeFileSync(controllerPath, controllerContent);
}

// Fix the WAHA service
const servicePath = path.join(__dirname, 'src/backend/src/services/wahaService.ts');
let serviceContent = fs.readFileSync(servicePath, 'utf8');

// Add validation to getMessages in the service
const serviceOldStart = `  async getMessages(chatId: string, limit: number = 50, sessionName: string = this.defaultSession): Promise<WAHAMessage[]> {
    try {
      console.log(\`[WAHA Service] Getting messages for chat '\${chatId}' in session '\${sessionName}'...\`);`;

const serviceNewStart = `  async getMessages(chatId: string, limit: number = 50, sessionName: string = this.defaultSession): Promise<WAHAMessage[]> {
    try {
      // Validate chatId to prevent [object Object] errors
      if (!chatId || typeof chatId !== 'string') {
        console.error(\`[WAHA Service] ❌ Invalid chatId type:\`, typeof chatId, chatId);
        return [];
      }
      
      // Check for literal "[object Object]" string
      if (chatId === '[object Object]' || chatId.includes('[object')) {
        console.error(\`[WAHA Service] ❌ Received invalid chatId "[object Object]"\`);
        return [];
      }
      
      console.log(\`[WAHA Service] Getting messages for chat '\${chatId}' in session '\${sessionName}'...\`);`;

// Handle line endings
serviceContent = serviceContent.replace(/\r\n/g, '\n');
const serviceOldStartNormalized = serviceOldStart.replace(/\r\n/g, '\n');
const serviceNewStartNormalized = serviceNewStart.replace(/\r\n/g, '\n');

if (serviceContent.includes(serviceOldStartNormalized)) {
  serviceContent = serviceContent.replace(serviceOldStartNormalized, serviceNewStartNormalized);
  serviceContent = serviceContent.replace(/\n/g, '\r\n');
  fs.writeFileSync(servicePath, serviceContent);
  console.log('✅ Fixed wahaService.ts');
} else {
  console.log('⚠️ Service already has validation or structure differs');
}

console.log('\n✅ Bug fix applied successfully!');
console.log('The system will now validate and reject any "[object Object]" chatIds.');
console.log('\nPlease restart the backend server for changes to take effect.');