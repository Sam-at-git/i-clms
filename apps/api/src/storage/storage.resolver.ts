import { Resolver, Query, Args, Int, Mutation } from '@nestjs/graphql';
import { StorageService } from './storage.service';
import { PresignedUrl } from './dto/file-upload.dto';

@Resolver()
export class StorageResolver {
  constructor(private readonly storageService: StorageService) {}

  @Query(() => PresignedUrl, { description: '获取文件预签名URL' })
  async getFileUrl(
    @Args('objectName') objectName: string,
    @Args('expirySeconds', { type: () => Int, nullable: true, defaultValue: 3600 })
    expirySeconds: number
  ): Promise<PresignedUrl> {
    const url = await this.storageService.getFileUrl(objectName, expirySeconds);
    return {
      url,
      objectName,
      expiresIn: expirySeconds,
    };
  }

  @Query(() => Boolean, { description: '检查文件是否存在' })
  async fileExists(@Args('objectName') objectName: string): Promise<boolean> {
    return this.storageService.fileExists(objectName);
  }

  @Mutation(() => Boolean, { description: '删除文件' })
  async deleteFile(@Args('objectName') objectName: string): Promise<boolean> {
    await this.storageService.deleteFile(objectName);
    return true;
  }
}
