import { Config } from '@remotion/cli/config';

Config.setEntryPoint('src/index.ts');
Config.setPublicDir('public');
Config.setCodec('h264');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setPixelFormat('yuv420p');
Config.setCrf(18);
Config.setAudioCodec('aac');
Config.setAudioBitrate('192k');
Config.setOverwriteOutput(true);
Config.setConcurrency(2);
