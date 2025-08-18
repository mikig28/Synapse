#!/usr/bin/env python3
"""
Direct fix for ResponseTextConfig import issue
This patches the import before CrewAI tries to use it
"""

import sys
import logging

logger = logging.getLogger(__name__)

def fix_openai_response_config():
    """Fix the ResponseTextConfig and ResponseTextConfigParam import issues"""
    try:
        # Fix ResponseTextConfig in response module
        import openai.types.responses.response as response_module
        
        # Check if ResponseTextConfig exists
        if not hasattr(response_module, 'ResponseTextConfig'):
            logger.info("🔧 Fixing ResponseTextConfig import issue...")
            
            # Check if the new name exists
            if hasattr(response_module, 'ResponseFormatTextConfig'):
                # Create the alias that CrewAI/LiteLLM expects
                response_module.ResponseTextConfig = response_module.ResponseFormatTextConfig
                logger.info("✅ Created ResponseTextConfig alias from ResponseFormatTextConfig")
            else:
                # Create a minimal compatible class
                class ResponseTextConfig:
                    """Compatibility class for ResponseTextConfig"""
                    def __init__(self, **kwargs):
                        for key, value in kwargs.items():
                            setattr(self, key, value)
                
                response_module.ResponseTextConfig = ResponseTextConfig
                logger.info("✅ Created ResponseTextConfig compatibility class")
        else:
            logger.info("✅ ResponseTextConfig already exists")
            
        # Fix ResponseTextConfigParam in response_create_params module
        import openai.types.responses.response_create_params as params_module
        
        if not hasattr(params_module, 'ResponseTextConfigParam'):
            logger.info("🔧 Fixing ResponseTextConfigParam import issue...")
            
            # Check if the new name exists
            if hasattr(params_module, 'ResponseFormatTextConfigParam'):
                # Create the alias that CrewAI/LiteLLM expects
                params_module.ResponseTextConfigParam = params_module.ResponseFormatTextConfigParam
                logger.info("✅ Created ResponseTextConfigParam alias from ResponseFormatTextConfigParam")
            else:
                # Create a minimal compatible class
                class ResponseTextConfigParam:
                    """Compatibility class for ResponseTextConfigParam"""
                    def __init__(self, **kwargs):
                        for key, value in kwargs.items():
                            setattr(self, key, value)
                
                params_module.ResponseTextConfigParam = ResponseTextConfigParam
                logger.info("✅ Created ResponseTextConfigParam compatibility class")
        else:
            logger.info("✅ ResponseTextConfigParam already exists")
            
        return True
            
    except ImportError as e:
        logger.error(f"❌ Could not access openai modules: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Error fixing OpenAI response config: {e}")
        return False

def apply_fix():
    """Apply the fix and test"""
    logger.info("🔧 Applying ResponseTextConfig fix...")
    
    if fix_openai_response_config():
        logger.info("✅ Fix applied successfully")
        
        # Test that CrewAI can now import
        try:
            from crewai import Agent, Task, Crew, Process
            logger.info("✅ CrewAI imports now working!")
            return True
        except Exception as e:
            logger.error(f"❌ CrewAI still failing after fix: {e}")
            return False
    else:
        logger.error("❌ Could not apply fix")
        return False

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    success = apply_fix()
    sys.exit(0 if success else 1)