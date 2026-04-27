/**
 * StandardModal — alias canônico para ActionModal.
 * Use em todos os modais novos. Modais antigos podem migrar gradualmente.
 */
export { ActionModal as StandardModal, ConfirmModal, DestructiveModal, FormModal } from '@/components/ui/ActionModal';
export type { ActionModalProps as StandardModalProps } from '@/components/ui/ActionModal';