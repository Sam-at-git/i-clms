import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../state/auth.state';
import {
  useParseContractWithLlmMutation,
  useStartParseContractAsyncMutation,
  useCheckContractDuplicateLazyQuery,
  useCreateOrUpdateContractMutation,
  useParseAndExtractMutation,
  useCreateContractMutation,
  useGetParseProgressQuery,
  ContractStatus,
} from '@i-clms/shared/generated/graphql';
import { JsonPreviewStep } from './JsonPreviewStep';
import { StrategySelector } from './StrategySelector';

interface ContractUploadProps {
  onClose: () => void;
  onSuccess: () => void;
}

// 解析进度类型
interface ParseProgress {
  sessionId: string;
  status: string;
  currentStage: string;
  totalChunks: number;
  completedChunks: number;
  currentChunkIndex: number;
  progressPercentage: number;
  chunks: Array<{
    chunkId: string;
    chunkIndex: number;
    purpose: string;
    status: string;
  }>;
  // 任务级别进度
  totalTasks: number;
  completedTasks: number;
  currentTaskInfo?: string;
  tasks: Array<{
    taskId: string;
    infoType: string;
    infoTypeName: string;
    status: string;
    startTime?: number;
    endTime?: number;
    error?: string;
    data?: any;
  }>;
  estimatedRemainingSeconds?: number;
}

// Extracted data types for LLM parsing
interface LlmExtractedData {
  contractType: string;
  basicInfo: {
    contractNo?: string | null;
    contractName?: string | null;
    ourEntity?: string | null;
    customerName?: string | null;
    status?: string | null;
  } | null;
  financialInfo?: {
    amountWithTax?: string | null;
    amountWithoutTax?: string | null;
    taxRate?: string | null;
    currency?: string | null;
    paymentMethod?: string | null;
    paymentTerms?: string | null;
  } | null;
  timeInfo?: {
    signedAt?: string | null;
    effectiveAt?: string | null;
    expiresAt?: string | null;
    duration?: string | null;
  } | null;
  otherInfo?: {
    salesPerson?: string | null;
    industry?: string | null;
    signLocation?: string | null;
    copies?: number | null;
  } | null;
  metadata?: {
    overallConfidence?: number;
  } | null;
  typeSpecificDetails?: any; // 类型特定详情（里程碑、费率、产品清单等）
}

// Parsed fields for simple parsing
interface SimpleParsedFields {
  contractNumber?: string;
  contractName?: string;
  partyA?: string;
  partyB?: string;
  signDate?: string;
  amount?: string;
  validPeriod?: string;
}

interface DuplicateContract {
  id: string;
  contractNo: string;
  name: string;
  amountWithTax: string;
  signedAt: string;
  status: string;
  customer: {
    name: string;
  };
}

type Step =
  | 'upload'
  | 'strategy_selection'
  | 'parsing'
  | 'review'
  | 'json_preview'
  | 'duplicate_check'
  | 'creating';

export function ContractUploadUnified({
  onClose,
  onSuccess,
}: ContractUploadProps) {
  const { user, token } = useAuthStore();
  const [step, setStep] = useState<Step>('upload');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [objectName, setObjectName] = useState('');

  // 解析进度状态
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [parseProgress, setParseProgress] = useState<ParseProgress | null>(null);
  const [progressPolling, setProgressPolling] = useState(false);

  // LLM parsing state
  const [extractedData, setExtractedData] = useState<LlmExtractedData | null>(null);
  const [llmFullResponse, setLlmFullResponse] = useState<any>(null); // 完整的LLM响应
  const [parseConfidence, setParseConfidence] = useState(0);
  const [typeSpecificDetails, setTypeSpecificDetails] = useState<any>(null); // 扩展字段
  const [duplicateInfo, setDuplicateInfo] = useState<{
    existingContract: DuplicateContract;
    message: string;
  } | null>(null);

  // Simple parsing state
  const [parsedFields, setParsedFields] = useState<SimpleParsedFields>({});

  // Strategy selection - default to LLM
  const [selectedStrategy, setSelectedStrategy] = useState<string>('LLM');

  // Form data
  const [formData, setFormData] = useState({
    contractNo: '',
    name: '',
    type: 'PROJECT_OUTSOURCING' as any,
    ourEntity: '',
    customerName: '',
    amountWithTax: '',
    signedAt: '',
    effectiveAt: '',
    expiresAt: '',
    paymentMethod: '',
    paymentTerms: '',
    salesPerson: '',
    industry: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // LLM mutations
  const [parseWithLlm] = useParseContractWithLlmMutation();
  const [startParseAsync] = useStartParseContractAsyncMutation();
  const [checkDuplicate] = useCheckContractDuplicateLazyQuery();
  const [createOrUpdateContract] = useCreateOrUpdateContractMutation();

  // Simple mutations
  const [parseAndExtract] = useParseAndExtractMutation();
  const [createContract] = useCreateContractMutation();

  // 进度轮询逻辑
  useEffect(() => {
    if (!sessionId || !progressPolling) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:3000/graphql'}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              authorization: token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify({
              query: `
                query GetParseProgress($sessionId: String!) {
                  getParseProgress(sessionId: $sessionId) {
                    sessionId
                    status
                    currentStage
                    totalChunks
                    completedChunks
                    currentChunkIndex
                    progressPercentage
                    chunks {
                      chunkId
                      chunkIndex
                      purpose
                      status
                    }
                    totalTasks
                    completedTasks
                    currentTaskInfo
                    tasks {
                      taskId
                      infoType
                      infoTypeName
                      status
                      startTime
                      endTime
                      error
                    }
                    estimatedRemainingSeconds
                    resultData
                  }
                }
              `,
              variables: { sessionId },
            }),
          },
        );

        const result = await response.json();
        if (result.data?.getParseProgress) {
          const progress = result.data.getParseProgress;
          console.log('[Parse Progress]', {
            status: progress.status,
            totalTasks: progress.totalTasks,
            completedTasks: progress.completedTasks,
            tasksCount: progress.tasks?.length,
            hasResultData: !!progress.resultData,
            resultDataKeys: progress.resultData ? Object.keys(progress.resultData) : [],
          });
          setParseProgress(progress);

          // 如果已完成或失败，停止轮询并更新UI
          if (progress.status?.toLowerCase() === 'completed') {
            setProgressPolling(false);
            console.log('[Parse Progress] Parsing completed, resultData:', progress.resultData);

            // 从 resultData 中获取解析结果
            if (progress.resultData) {
              const llmResult = progress.resultData;
              console.log('[Parse Progress] LLM result:', { success: llmResult.success, hasExtractedData: !!llmResult.extractedData });
              if (llmResult.success && llmResult.extractedData) {
                const extracted = llmResult.extractedData as LlmExtractedData;
                console.log('[Parse Progress] Extracted data:', extracted);

                setExtractedData(extracted);
                setParseConfidence(extracted.metadata?.overallConfidence || 0);
                setTypeSpecificDetails(extracted.typeSpecificDetails || null);
                setLlmFullResponse(llmResult);

                // Fill form with LLM extracted data
                setFormData({
                  contractNo: extracted.basicInfo?.contractNo || '',
                  name: extracted.basicInfo?.contractName || '',
                  type: (extracted.contractType as any) || 'PROJECT_OUTSOURCING',
                  ourEntity: extracted.basicInfo?.ourEntity || '',
                  customerName: extracted.basicInfo?.customerName || '',
                  amountWithTax: extracted.financialInfo?.amountWithTax || '',
                  signedAt: extracted.timeInfo?.signedAt || '',
                  effectiveAt: extracted.timeInfo?.effectiveAt || '',
                  expiresAt: extracted.timeInfo?.expiresAt || '',
                  paymentMethod: extracted.financialInfo?.paymentMethod || '',
                  paymentTerms: extracted.financialInfo?.paymentTerms || '',
                  salesPerson: extracted.otherInfo?.salesPerson || '',
                  industry: extracted.otherInfo?.industry || '',
                });

                console.log('[Parse Progress] Navigating to review step');
                // 跳转到review步骤
                setStep('review');
              } else {
                console.error('[Parse Progress] Invalid result:', llmResult);
                setError(llmResult.error || '解析数据为空');
                setStep('upload');
              }
            } else {
              console.error('[Parse Progress] No resultData in completed session');
              setError('解析完成但没有返回数据');
              setStep('upload');
            }
          } else if (progress.status?.toLowerCase() === 'failed') {
            setProgressPolling(false);
            setError(progress.error || '解析失败');
            setStep('upload');
          }
        } else if (result.errors) {
          console.error('[Parse Progress] GraphQL errors:', result.errors);
        }
      } catch (err) {
        console.error('Failed to poll progress:', err);
      }
    }, 1500); // 每1.5秒轮询一次

    return () => clearInterval(pollInterval);
  }, [sessionId, progressPolling, token]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('只支持 PDF 和 Word 文档');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('文件大小不能超过 50MB');
      return;
    }

    setUploading(true);
    setError('');
    setStep('upload');

    try {
      // 1. Upload file
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const apiUrl =
        import.meta.env.VITE_GRAPHQL_URL?.replace('/graphql', '') ||
        'http://localhost:3000';
      const response = await fetch(
        `${apiUrl}/api/storage/upload?folder=contracts`,
        {
          method: 'POST',
          body: uploadFormData,
        },
      );

      if (!response.ok) {
        throw new Error('文件上传失败');
      }

      const uploadResult = await response.json();
      setObjectName(uploadResult.objectName);

      // 2. Go to strategy selection step
      setStep('strategy_selection');
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
      setStep('upload');
    } finally {
      setUploading(false);
    }
  };

  const handleLlmParsing = async (objName: string, strategy: string) => {
    console.log('[LLM Parsing] Starting for:', objName, 'strategy:', strategy);

    // Step 1: 启动异步解析任务（立即返回，在后台执行）
    try {
      const startAsyncResponse = await fetch(
        `${import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:3000/graphql'}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authorization: token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({
            query: `
              mutation StartParseContractAsync($objectName: String!, $strategy: ParseStrategyType) {
                startParseContractAsync(objectName: $objectName, strategy: $strategy) {
                  sessionId
                  message
                }
              }
            `,
            variables: { objectName: objName, strategy },
          }),
        },
      );

      const asyncResult = await startAsyncResponse.json();
      console.log('[LLM Parsing] Async start result:', asyncResult);

      if (asyncResult.errors) {
        console.error('[LLM Parsing] GraphQL errors:', asyncResult.errors);
        setError(asyncResult.errors.map((e: any) => e.message).join(', '));
        setStep('upload');
        return;
      }

      if (asyncResult.data?.startParseContractAsync?.sessionId) {
        const sessionId = asyncResult.data.startParseContractAsync.sessionId;
        console.log('[LLM Parsing] Started async parsing, session:', sessionId);
        setSessionId(sessionId);
        setProgressPolling(true);
        // 步骤切换到parsing以显示进度界面
        // 注意：我们不等待解析完成，而是让轮询逻辑处理结果
      } else {
        console.error('[LLM Parsing] Failed to start async parsing:', asyncResult);
        setError('启动解析任务失败');
        setStep('upload');
      }
    } catch (err) {
      console.error('[LLM Parsing] Failed to start async parsing:', err);
      setError(err instanceof Error ? err.message : '启动解析失败');
      setStep('upload');
    }
  };

  const handleSimpleParsing = async (objName: string) => {
    const { data } = await parseAndExtract({
      variables: { objectName: objName },
    });

    if (data?.parseAndExtract?.success) {
      const fields = data.parseAndExtract.extractedFields || {};
      setParsedFields(fields as SimpleParsedFields);

      // Fill form with simple parsed data
      setFormData((prev) => ({
        ...prev,
        contractNo: (fields as SimpleParsedFields).contractNumber || '',
        name: (fields as SimpleParsedFields).contractName || '',
        amountWithTax: (fields as SimpleParsedFields).amount || '',
        signedAt: (fields as SimpleParsedFields).signDate || '',
        ourEntity: (fields as SimpleParsedFields).partyB || '',
        customerName: (fields as SimpleParsedFields).partyA || '',
      }));

      setStep('review');
    } else {
      setError('解析失败');
      setStep('upload');
    }
  };

  const handleReviewConfirm = async () => {
    if (!formData.contractNo) {
      setError('合同编号不能为空');
      return;
    }

    setError('');

    // All strategies use the LLM parsing flow for now
    // 跳转到JSON预览步骤
    setStep('json_preview');
  };

  // 从JSON预览继续，检查重复
  const handleJsonPreviewContinue = async () => {
    try {
      const { data } = await checkDuplicate({
        variables: { contractNo: formData.contractNo },
      });

      if (data?.checkContractDuplicate?.isDuplicate) {
        const existing = data.checkContractDuplicate.existingContract;
        if (!existing) {
          setError('重复合同信息缺失');
          return;
        }

        setDuplicateInfo({
          existingContract: {
            id: existing.id,
            contractNo: existing.contractNo || '',
            name: existing.name || '',
            amountWithTax: existing.amountWithTax || '',
            signedAt: existing.signedAt || '',
            status: existing.status || 'DRAFT',
            customer: {
              name: existing.customer?.name || '',
            },
          },
          message: data.checkContractDuplicate.message || '发现重复合同',
        });
        setStep('duplicate_check');
      } else {
        // No duplicate, create directly
        handleCreateContract(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '重复检测失败');
    }
  };

  const handleCreateContract = async (forceUpdate: boolean) => {
    if (!user) {
      setError('用户未登录');
      return;
    }

    setStep('creating');
    setError('');

    try {
      // 根据合同类型构建扩展字段
      const typeSpecificInput: any = {};
      if (typeSpecificDetails) {
        switch (formData.type) {
          case 'PROJECT_OUTSOURCING':
            if (typeSpecificDetails.milestones && typeSpecificDetails.milestones.length > 0) {
              typeSpecificInput.projectOutsourcingDetail = {
                sowSummary: typeSpecificDetails.sowSummary,
                deliverables: typeSpecificDetails.deliverables,
                acceptanceCriteria: typeSpecificDetails.acceptanceCriteria,
                acceptanceFlow: typeSpecificDetails.acceptanceFlow,
                changeManagementFlow: typeSpecificDetails.changeManagementFlow,
                milestones: typeSpecificDetails.milestones.map((m: any) => ({
                  sequence: m.sequence || 0,
                  name: m.name || '',
                  deliverables: m.deliverables || null,
                  amount: m.amount || null,
                  paymentPercentage: m.paymentPercentage || null,
                  plannedDate: m.plannedDate ? new Date(m.plannedDate) : null,
                  acceptanceCriteria: m.acceptanceCriteria || null,
                  status: m.status || 'PENDING',
                })),
              };
            }
            break;
          case 'STAFF_AUGMENTATION':
            if (typeSpecificDetails.rateItems && typeSpecificDetails.rateItems.length > 0) {
              typeSpecificInput.staffAugmentationDetail = {
                estimatedTotalHours: typeSpecificDetails.estimatedTotalHours || null,
                monthlyHoursCap: typeSpecificDetails.monthlyHoursCap || null,
                yearlyHoursCap: typeSpecificDetails.yearlyHoursCap || null,
                settlementCycle: typeSpecificDetails.settlementCycle || null,
                timesheetApprovalFlow: typeSpecificDetails.timesheetApprovalFlow || null,
                adjustmentMechanism: typeSpecificDetails.adjustmentMechanism || null,
                staffReplacementFlow: typeSpecificDetails.staffReplacementFlow || null,
                rateItems: typeSpecificDetails.rateItems.map((r: any) => ({
                  role: r.role || '',
                  rateType: r.rateType || 'HOURLY',
                  rate: r.rate || '0',
                  rateEffectiveFrom: r.rateEffectiveFrom ? new Date(r.rateEffectiveFrom) : null,
                  rateEffectiveTo: r.rateEffectiveTo ? new Date(r.rateEffectiveTo) : null,
                })),
              };
            }
            break;
          case 'PRODUCT_SALES':
            if (typeSpecificDetails.lineItems && typeSpecificDetails.lineItems.length > 0) {
              typeSpecificInput.productSalesDetail = {
                deliveryContent: typeSpecificDetails.deliveryContent || null,
                deliveryDate: typeSpecificDetails.deliveryDate ? new Date(typeSpecificDetails.deliveryDate) : null,
                deliveryLocation: typeSpecificDetails.deliveryLocation || null,
                shippingResponsibility: typeSpecificDetails.shippingResponsibility || null,
                ipOwnership: typeSpecificDetails.ipOwnership || null,
                warrantyPeriod: typeSpecificDetails.warrantyPeriod || null,
                afterSalesTerms: typeSpecificDetails.afterSalesTerms || null,
                lineItems: typeSpecificDetails.lineItems.map((item: any) => ({
                  productName: item.productName || '',
                  specification: item.specification || null,
                  quantity: item.quantity || 1,
                  unit: item.unit || '套',
                  unitPriceWithTax: item.unitPriceWithTax || '0',
                  unitPriceWithoutTax: item.unitPriceWithoutTax || null,
                  subtotal: item.subtotal || null,
                })),
              };
            }
            break;
        }
      }

      await createOrUpdateContract({
        variables: {
          input: {
            contractNo: formData.contractNo,
            name: formData.name,
            type: formData.type,
            ourEntity: formData.ourEntity,
            customerName: formData.customerName,
            amountWithTax: formData.amountWithTax || '0',
            currency: 'CNY',
            signedAt: formData.signedAt || null,
            effectiveAt: formData.effectiveAt || null,
            expiresAt: formData.expiresAt || null,
            paymentMethod: formData.paymentMethod || null,
            paymentTerms: formData.paymentTerms || null,
            salesPerson: formData.salesPerson || null,
            industry: formData.industry || null,
            status: ContractStatus.Draft,
            fileUrl: objectName,
            departmentId: user.department.id,
            uploadedById: user.id,
            ...typeSpecificInput,
          },
          forceUpdate,
          operatorId: user.id,
        },
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建合同失败');
      setStep('review');
    }
  };

  const handleCreateSimpleContract = async () => {
    if (!user) {
      setError('用户未登录');
      return;
    }

    setStep('creating');
    setError('');

    try {
      await createContract({
        variables: {
          input: {
            contractNo: formData.contractNo,
            name: formData.name,
            type: formData.type,
            ourEntity: formData.ourEntity,
            customerName: formData.customerName,
            amountWithTax: formData.amountWithTax || '0',
            currency: 'CNY',
            signedAt: formData.signedAt || null,
            status: ContractStatus.Draft,
            fileUrl: objectName,
            departmentId: user.department.id,
            uploadedById: user.id,
          },
        },
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建合同失败');
      setStep('review');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            {step === 'upload' && '上传合同文件'}
            {step === 'strategy_selection' && '选择解析策略'}
            {step === 'parsing' && '解析中...'}
            {step === 'review' && '确认合同信息'}
            {step === 'json_preview' && 'AI解析结果预览'}
            {step === 'duplicate_check' && '检测到重复合同'}
            {step === 'creating' && '创建中...'}
          </h2>
          <button onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {/* Step 1: Upload file */}
        {step === 'upload' && (
          <div style={styles.uploadArea}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <div
              style={styles.dropZone}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <p>上传中...</p>
              ) : (
                <>
                  <p style={styles.uploadIcon}>📄</p>
                  <p>点击选择文件或拖拽到此处</p>
                  <p style={styles.hint}>
                    支持 PDF、Word 文档，最大 50MB
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Strategy Selection */}
        {step === 'strategy_selection' && (
          <div style={styles.strategySelectionArea}>
            <div style={styles.strategySelectionContent}>
              <p style={{ ...styles.hint, marginBottom: '16px' }}>
                请选择合同解析策略。系统将根据您选择的策略提取合同信息。
              </p>
              <StrategySelector
                selectedStrategy={selectedStrategy}
                onStrategyChange={(strategy) => setSelectedStrategy(strategy)}
              />
            </div>
            <div style={styles.actions}>
              <button
                onClick={() => setStep('upload')}
                style={styles.cancelButton}
              >
                返回
              </button>
              <button
                onClick={() => {
                  setStep('parsing');
                  handleLlmParsing(objectName, selectedStrategy);
                }}
                style={styles.submitButton}
              >
                开始解析
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Parsing */}
        {step === 'parsing' && (
          <div style={styles.loading}>
            <p style={styles.loadingIcon}>🤖</p>
            <p>
              {parseProgress?.currentStage || 'AI正在智能解析合同内容...'}
            </p>

            {/* 进度条 */}
            {parseProgress && parseProgress.totalChunks > 0 && (
              <div style={styles.progressContainer}>
                <div style={styles.progressInfo}>
                  <span>进度: {parseProgress.completedChunks}/{parseProgress.totalChunks} 分块</span>
                  {parseProgress.estimatedRemainingSeconds !== undefined && (
                    <span>预计剩余: {parseProgress.estimatedRemainingSeconds}秒</span>
                  )}
                </div>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${parseProgress.progressPercentage}%`,
                    }}
                  />
                </div>
                <div style={styles.progressPercentage}>
                  {parseProgress.progressPercentage}%
                </div>

                {/* 任务进度详情 - 优先显示 */}
                {parseProgress.totalTasks > 0 && (
                  <div style={styles.tasksList}>
                    <div style={styles.taskListHeader}>
                      <span>📋 信息提取进度 ({parseProgress.completedTasks}/{parseProgress.totalTasks})</span>
                    </div>
                    {parseProgress.tasks.map((task) => (
                      <div
                        key={task.taskId}
                        style={{
                          ...styles.taskItem,
                          ...(task.status === 'completed' ? styles.taskCompleted :
                            task.status === 'processing' ? styles.taskProcessing :
                            task.status === 'failed' ? styles.taskFailed :
                            styles.taskPending),
                        }}
                      >
                        <span style={styles.taskIcon}>
                          {task.status === 'completed' && '✓'}
                          {task.status === 'processing' && '⏳'}
                          {task.status === 'pending' && '○'}
                          {task.status === 'failed' && '✗'}
                        </span>
                        <span style={styles.taskName}>{task.infoTypeName}</span>
                        {task.status === 'processing' && (
                          <span style={styles.taskProcessingIndicator}>处理中...</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 当前任务信息 */}
                {parseProgress.currentTaskInfo && (
                  <div style={styles.currentTaskBanner}>
                    🔸 正在提取: {parseProgress.currentTaskInfo}
                  </div>
                )}

                {/* 分块详情 - 如果有分块进度，显示在任务进度之后 */}
                {parseProgress.totalChunks > 0 && parseProgress.totalChunks > 0 && parseProgress.chunks.length > 0 && (
                  <div style={styles.chunksList}>
                    <div style={styles.taskListHeader}>
                      <span>📄 文档分块处理 ({parseProgress.completedChunks}/{parseProgress.totalChunks})</span>
                    </div>
                    {parseProgress.chunks.map((chunk) => (
                      <div
                        key={chunk.chunkId}
                        style={{
                          ...styles.chunkItem,
                          ...(chunk.status === 'completed' ? styles.chunkCompleted :
                            chunk.status === 'processing' ? styles.chunkProcessing :
                            styles.chunkPending),
                        }}
                      >
                        <span style={styles.chunkIndex}>{chunk.chunkIndex + 1}. </span>
                        <span style={styles.chunkPurpose}>{chunk.purpose}</span>
                        <span style={styles.chunkStatus}>
                          {chunk.status === 'completed' && '✓'}
                          {chunk.status === 'processing' && '⏳'}
                          {chunk.status === 'pending' && '○'}
                          {chunk.status === 'failed' && '✗'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <p style={styles.hint}>
              这可能需要10-30秒，大文件可能需要更长时间
            </p>
          </div>
        )}

        {/* Step 4: Review and edit */}
        {step === 'review' && (
          <div style={styles.reviewContainer}>
            {/* Confidence banner */}
            {parseConfidence > 0 && (
              <div style={styles.confidenceBanner}>
                <span>
                  AI解析置信度: {(parseConfidence * 100).toFixed(1)}%
                </span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleReviewConfirm();
              }}
              style={styles.form}
            >
              <div style={styles.formGrid}>
                <div style={styles.field}>
                  <label style={styles.label}>合同编号 *</label>
                  <input
                    type="text"
                    value={formData.contractNo}
                    onChange={(e) =>
                      handleInputChange('contractNo', e.target.value)
                    }
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>合同名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      handleInputChange('name', e.target.value)
                    }
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>合同类型</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      handleInputChange('type', e.target.value)
                    }
                    style={styles.input}
                  >
                    <option value="STAFF_AUGMENTATION">人力框架</option>
                    <option value="PROJECT_OUTSOURCING">
                      项目外包
                    </option>
                    <option value="PRODUCT_SALES">产品购销</option>
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>我方主体</label>
                  <input
                    type="text"
                    value={formData.ourEntity}
                    onChange={(e) =>
                      handleInputChange('ourEntity', e.target.value)
                    }
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>客户名称</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) =>
                      handleInputChange('customerName', e.target.value)
                    }
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>合同金额</label>
                  <input
                    type="number"
                    value={formData.amountWithTax}
                    onChange={(e) =>
                      handleInputChange('amountWithTax', e.target.value)
                    }
                    style={styles.input}
                    step="0.01"
                  />
                </div>

                {/* Additional fields */}
                <div style={styles.field}>
                  <label style={styles.label}>生效日期</label>
                  <input
                    type="date"
                    value={formData.effectiveAt}
                    onChange={(e) =>
                      handleInputChange('effectiveAt', e.target.value)
                    }
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>终止日期</label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) =>
                      handleInputChange('expiresAt', e.target.value)
                    }
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>付款方式</label>
                  <input
                    type="text"
                    value={formData.paymentMethod}
                    onChange={(e) =>
                      handleInputChange('paymentMethod', e.target.value)
                    }
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>付款条件</label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) =>
                      handleInputChange('paymentTerms', e.target.value)
                    }
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>销售负责人</label>
                  <input
                    type="text"
                    value={formData.salesPerson}
                    onChange={(e) =>
                      handleInputChange('salesPerson', e.target.value)
                    }
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>所属行业</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) =>
                      handleInputChange('industry', e.target.value)
                    }
                    style={styles.input}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>签订日期</label>
                  <input
                    type="date"
                    value={formData.signedAt}
                    onChange={(e) =>
                      handleInputChange('signedAt', e.target.value)
                    }
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.actions}>
                <button
                  type="button"
                  onClick={onClose}
                  style={styles.cancelButton}
                >
                  取消
                </button>
                <button type="submit" style={styles.submitButton}>
                  下一步：检查重复
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3.5: JSON Preview */}
        {step === 'json_preview' && llmFullResponse && (
          <JsonPreviewStep
            data={llmFullResponse}
            onBack={() => setStep('review')}
            onContinue={handleJsonPreviewContinue}
          />
        )}

        {/* Step 4: Duplicate check */}
        {step === 'duplicate_check' && duplicateInfo && (
          <div style={styles.duplicateContainer}>
            <div style={styles.warningBanner}>
              ⚠️ {duplicateInfo.message}
            </div>

            <div style={styles.comparisonGrid}>
              <div>
                <h3 style={styles.comparisonTitle}>现有合同</h3>
                <div style={styles.comparisonCard}>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>
                      合同编号:
                    </span>
                    <span>{duplicateInfo.existingContract.contractNo}</span>
                  </div>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>
                      合同名称:
                    </span>
                    <span>{duplicateInfo.existingContract.name}</span>
                  </div>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>客户:</span>
                    <span>
                      {duplicateInfo.existingContract.customer?.name}
                    </span>
                  </div>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>金额:</span>
                    <span>
                      ¥{duplicateInfo.existingContract.amountWithTax}
                    </span>
                  </div>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>
                      签订日期:
                    </span>
                    <span>{duplicateInfo.existingContract.signedAt}</span>
                  </div>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>状态:</span>
                    <span>{duplicateInfo.existingContract.status}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={styles.comparisonTitle}>新上传合同</h3>
                <div style={styles.comparisonCard}>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>
                      合同编号:
                    </span>
                    <span>{formData.contractNo}</span>
                  </div>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>
                      合同名称:
                    </span>
                    <span>{formData.name}</span>
                  </div>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>客户:</span>
                    <span>{formData.customerName}</span>
                  </div>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>金额:</span>
                    <span>¥{formData.amountWithTax}</span>
                  </div>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>
                      签订日期:
                    </span>
                    <span>{formData.signedAt}</span>
                  </div>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>状态:</span>
                    <span>DRAFT (新)</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.actions}>
              <button
                onClick={() => setStep('review')}
                style={styles.cancelButton}
              >
                返回修改
              </button>
              <button
                onClick={() => handleCreateContract(true)}
                style={styles.dangerButton}
              >
                强制更新现有合同
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Creating */}
        {step === 'creating' && (
          <div style={styles.loading}>
            <p>正在创建合同...</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
  },
  error: {
    margin: '16px 24px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
  },
  uploadArea: {
    padding: '24px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '8px',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  dropZone: {
    border: '2px dashed #d1d5db',
    borderRadius: '8px',
    padding: '48px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  uploadIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  hint: {
    color: '#6b7280',
    fontSize: '13px',
    marginTop: '8px',
  },
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#6b7280',
  },
  loadingIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  reviewContainer: {
    padding: '24px',
  },
  confidenceBanner: {
    padding: '12px',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
    textAlign: 'center',
    fontWeight: 500,
  },
  form: {
    marginTop: '16px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  cancelButton: {
    padding: '10px 20px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    background: '#fff',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '10px 20px',
    fontSize: '14px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    cursor: 'pointer',
  },
  dangerButton: {
    padding: '10px 20px',
    fontSize: '14px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#ef4444',
    color: '#fff',
    cursor: 'pointer',
  },
  duplicateContainer: {
    padding: '24px',
  },
  warningBanner: {
    padding: '12px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '24px',
    fontWeight: 500,
  },
  comparisonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '24px',
    marginBottom: '24px',
  },
  comparisonTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '12px',
    color: '#374151',
  },
  comparisonCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    backgroundColor: '#f9fafb',
  },
  comparisonRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  comparisonLabel: {
    fontWeight: 500,
    color: '#6b7280',
    fontSize: '14px',
  },
  // 进度条相关样式
  progressContainer: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '13px',
    color: '#6b7280',
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    transition: 'width 0.3s ease',
    borderRadius: '4px',
  },
  progressPercentage: {
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: '#3b82f6',
  },
  chunksList: {
    marginTop: '16px',
    maxHeight: '150px',
    overflowY: 'auto',
  },
  chunkItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    marginBottom: '4px',
    borderRadius: '4px',
    fontSize: '13px',
  },
  chunkCompleted: {
    backgroundColor: '#ecfdf5',
    color: '#059669',
  },
  chunkProcessing: {
    backgroundColor: '#eff6ff',
    color: '#3b82f6',
  },
  chunkPending: {
    backgroundColor: '#f9fafb',
    color: '#9ca3af',
  },
  chunkIndex: {
    fontWeight: 600,
    marginRight: '8px',
    minWidth: '24px',
  },
  chunkPurpose: {
    flex: 1,
  },
  chunkStatus: {
    marginLeft: '8px',
    fontSize: '14px',
  },
  // 任务进度样式
  tasksList: {
    marginTop: '16px',
  },
  taskListHeader: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '8px',
  },
  taskItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    marginBottom: '4px',
    borderRadius: '6px',
    fontSize: '13px',
    border: '1px solid #e5e7eb',
  },
  taskPending: {
    backgroundColor: '#f9fafb',
    color: '#9ca3af',
  },
  taskProcessing: {
    backgroundColor: '#eff6ff',
    color: '#3b82f6',
    borderColor: '#3b82f6',
  },
  taskCompleted: {
    backgroundColor: '#ecfdf5',
    color: '#059669',
    borderColor: '#10b981',
  },
  taskFailed: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderColor: '#ef4444',
  },
  taskIcon: {
    marginRight: '8px',
    fontSize: '14px',
    minWidth: '20px',
  },
  taskName: {
    flex: 1,
    fontWeight: 500,
  },
  taskProcessingIndicator: {
    fontSize: '11px',
    color: '#3b82f6',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  currentTaskBanner: {
    marginTop: '12px',
    padding: '10px 12px',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    textAlign: 'center',
  },
  // Strategy selection step styles
  strategySelectionArea: {
    padding: '24px',
  },
  strategySelectionContent: {
    marginBottom: '24px',
  },
};

export default ContractUploadUnified;
