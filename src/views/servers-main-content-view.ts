import View from '../lib/view';
import { $, base64Url, capitalize, isClosestElementOfCssClass } from '../utils/functions';
import MainView from './main-view';
import * as userIcon from '../assets/icons/discord.svg';
import { Channel, ChannelInvite, MongoObjectId, Profile } from '../types/entities';
import { translation } from '../utils/lang';
import * as upload from '../assets/icons/upload.svg';
import { API_URL } from '../constants';
export type RenderedChannelMessage = {
  id: MongoObjectId;
  service: boolean;
  userId: MongoObjectId;
  username: string;
  date: string;
  message: string;
  img: string;
  responsedToMessage: RenderedChannelMessage | null;
};

class ServersMainContentView extends View {
  static readonly classNames = {};
  img: string | File = '';
  channel: Channel | null;
  $chatInput: HTMLInputElement;
  $replyContainer: HTMLDivElement;
  $messageList: HTMLUListElement;
  $repliedMessage: HTMLLIElement | null;
  messagesMap: Map<
    HTMLLIElement,
    {
      $fastMenu: HTMLDivElement;
      $menu: HTMLDivElement;
      $editFormContainer: HTMLDivElement;
      $messageContent: HTMLElement;
      message: RenderedChannelMessage;
    }
  >;
  editedMessageContent: string;
  $imageInput: HTMLInputElement & { name: string; type: string };

  get messageText() {
    return this.$chatInput.value;
  }

  constructor(channel: Channel | null) {
    const $root = MainView.$mainContent;

    if (!$root) {
      ServersMainContentView.throwNoRootInTheDomError('Main-content');
    }
    super($root);
    this.channel = channel;
    this.$chatInput = $('input', 'chat__input');
    this.$messageList = $('ul', 'chat__messages-list');
    this.$replyContainer = $('div', 'chat__reply-container');
    this.$repliedMessage = null;
    this.messagesMap = new Map();
    this.editedMessageContent = '';
    this.$imageInput = Object.assign($('input', 'form-avatar__input-image'), {
      name: 'avatar',
      type: 'file',
    });
  }
  build(): void {
    const __ = translation();
    const $container = $('div', 'chat');
    const $inputContainer = $('div', 'chat__input-container');

    const messagesFake: RenderedChannelMessage[] = [
      // {
      //   id: '01',
      //   userId: '03',
      //   username: 'Hlib Hodovaniuk',
      //   date: '01/26/2023 9:44 AM',
      //   message: 'Hello',
      //   responsedToMessage: null,
      //   service: false,
      // },
      // {
      //   id: '02',
      //   userId: '03',
      //   username: 'Alexander Chornyi',
      //   date: '01/26/2023 9:45 AM',
      //   message: 'Hi',
      //   responsedToMessage: null,
      //   service: false,
      // },
      // {
      //   id: '01',
      //   userId: '03',
      //   username: 'Hlib Hodovaniuk',
      //   date: '01/26/2023 9:47 AM',
      //   message: 'How do you do?',
      //   responsedToMessage: null,
      //   service: false,
      // },
    ];

    if (this.channel) {
      const $imageInputContainer = $('div', ['form__image-input-container', 'form-avatar__image-input-container']);

      const $imageUpload = $('img', ['form-avatar__image-upload', 'form__image']);
      $imageUpload.src = upload.default;
      $imageInputContainer.append(this.$imageInput, $imageUpload);
      this.img = '';
      this.$imageInput.onchange = (event: Event) => {
        event.preventDefault();
        const target = event.target as HTMLInputElement;
        const file: File = (target.files as FileList)[0];
        const formData = new FormData();
        formData.append('img', file ? file : '');
        // const avatar = formData.get('img');
        this.img = file ? file : '';
      };

      $inputContainer.append(this.$replyContainer, this.$chatInput, $imageInputContainer);
      $container.append(this.$messageList, $inputContainer);
    } else {
      const $notFound = $('div', 'chat__not-found');
      $notFound.textContent = __.common.noChat;
      $container.append($notFound);
    }

    this.$container.append($container);
  }

  createMessageItem(
    message_: RenderedChannelMessage & { profile: Profile | null },
    invites: ChannelInvite[]
  ): HTMLLIElement {
    const { id, username, message, date, responsedToMessage, service, img } = message_;
    console.log(message_);
    const $item = $('li', ['chat__messages-list-item', 'channel-message']);
    const $userIconBlock = $('div', 'channel-message__icon-block');
    const $userIcon = $('img', 'channel-message__icon');
    $userIcon.src = message_.profile?.avatar ? base64Url(message_.profile.avatar) : userIcon.default;

    const $Icon = $('img', 'personal-message__icon444');
    $Icon.src = img ? base64Url(img) : '';
    console.log(img);
    const $userBlock = $('div', 'channel-message__user-block');
    const $messageBlock = $('div', 'channel-message__massages-block');
    const $info = $('div', 'channel-message__info');
    const $userName = $('span', 'channel-message__name');
    const $messageDate = $('span', 'channel-message__date');
    const $message = $('p', 'channel-message__message');
    const $fastMenu = $('div', 'chat__fast-menu');
    const $editFormContainer = $('div', 'channel-message__edit-form-container');
    const $menu = $('div', 'chat__menu');

    $userName.textContent = service ? `#${this.channel?.name || '#Unknown Channel'}` : `${username}`;
    $messageDate.textContent = `${date}`;
    $message.textContent = message;

    $userIconBlock.append($userIcon);
    $info.append($userName, $messageDate);
    $messageBlock.append($info, $message, $Icon);
    $userBlock.append($userIconBlock, $messageBlock);
    $item.append($userBlock, $editFormContainer, $menu, $fastMenu);
    //$item.append($userIconBlock, $messageBlock, $editFormContainer, $fastMenu, $menu);

    if (responsedToMessage) {
      const $repliedInfo = $('p', 'channel-message__replied-info');
      $repliedInfo.textContent = `${responsedToMessage.username} | ${responsedToMessage.message}`;
      $repliedInfo.dataset.scrollTo = `#channel-message-${responsedToMessage.id}`;
      $messageBlock.prepend($repliedInfo);
      $item.classList.add('replied');
    }

    $item.id = `channel-message-${id}`;

    this.messagesMap.set($item, { $fastMenu, $menu, $editFormContainer, $messageContent: $message, message: message_ });

    return $item;
  }

  displayChatInput(placeholder: string) {
    this.$chatInput.placeholder = placeholder;
  }

  displayMessages = (messages: (RenderedChannelMessage & { profile: Profile | null })[], invites: ChannelInvite[]) => {
    console.log(messages);
    this.$messageList.innerHTML = '';
    this.messagesMap = new Map();
    messages.forEach((message) => {
      this.$messageList.append(this.createMessageItem(message, invites));
    });
  };

  scrollToBottom(): void {
    this.$messageList.scrollTo(0, this.$messageList.scrollHeight);
  }

  bindMessageEvent(
    handler: (messageText: string, responsedToMessageId: string | null, img: string | File) => Promise<void>
  ) {
    this.$chatInput.addEventListener('keypress', async (event) => {
      if (event.key === 'Enter') {
        await handler(this.messageText, this.getReplyId() || null, this.img);
        this.resetInput();
        if (this.$repliedMessage) {
          this.destroyReply(this.$repliedMessage);
        }
      }
    });
  }

  bindMessageHover = (
    displayFastMenuHandler: (
      $container: HTMLElement,
      $message: HTMLLIElement,
      message: RenderedChannelMessage
    ) => Promise<void>
  ): void => {
    this.$messageList.onmouseover = async (mouseOverEvent) => {
      if (isClosestElementOfCssClass<HTMLLIElement>(mouseOverEvent.target, 'channel-message')) {
        const isEdit = mouseOverEvent.target.classList.contains('channel-message_edit');
        if (!isEdit) {
          const $message = mouseOverEvent.target.closest<HTMLLIElement>('.channel-message');
          const items = this.messagesMap.get(mouseOverEvent.target);
          if (items) {
            await displayFastMenuHandler(items.$fastMenu, mouseOverEvent.target, items.message);
            window.removeEventListener('keyup', ServersMainContentView.onMessageHoverKeyup);
            window.addEventListener(
              'keyup',
              (ServersMainContentView.onMessageHoverKeyup = (event) => {
                const key = event.key.toLowerCase();
                if (!$message) {
                  return;
                }
                if (event.target instanceof HTMLInputElement) {
                  return;
                }
                this.onMessageHoverKey(key, $message, items.message, isEdit, mouseOverEvent);
              })
            );
            mouseOverEvent.target.onmouseleave = () => {
              this.destroyFastMenu();
              window.removeEventListener('keyup', ServersMainContentView.onMessageHoverKeyup);
            };
          }
        }
      }
    };
  };

  bindMessageListClicks = () => {
    this.$messageList.addEventListener('click', (event) => {
      this.onFastMenuEditButtonClick(event);
      this.onFastMenuDeleteButtonClick(event);
      this.onFastMenuReplyButtonClick(event);
      this.onRepliedInfoClick(event);
    });
  };

  bindDestroyFastMenu = (destroyFastMenuHandler: () => void): void => {
    this.destroyFastMenu = destroyFastMenuHandler;
  };

  destroyFastMenu = (): void => {};

  getReplyId(): string | null {
    if (!this.$repliedMessage) {
      return null;
    }
    const items = this.messagesMap.get(this.$repliedMessage);
    if (!items) {
      return null;
    }
    return items.message.id;
  }

  private resetInput() {
    this.$chatInput.value = '';
    this.$imageInput.value = '';
    this.img = '';
  }

  destroyReply($message: HTMLLIElement): void {
    this.$repliedMessage = null;
    $message.classList.remove('channel-message_reply');
    this.destroyInputReply();
  }

  destroyOthersReply($message: HTMLLIElement) {
    this.messagesMap.forEach((items, $item) => {
      if ($message !== $item) {
        this.destroyReply($item);
      }
    });
  }

  destroyInputReply(): void {
    this.$replyContainer.innerHTML = '';
  }

  destroyEditMessageForm($message: HTMLLIElement): void {
    const items = this.messagesMap.get($message);
    if (!items) {
      return;
    }
    items.$editFormContainer.innerHTML = '';
    $message.classList.remove('channel-message_edit');
    this.resetFormHotKeys();
  }

  displayEditMessageForm = ($message: HTMLLIElement): void => {
    const items = this.messagesMap.get($message);
    if (!items) {
      return;
    }
    const $form = this.createEditMessageForm($message, items.message);
    items.$editFormContainer.innerHTML = '';
    items.$editFormContainer.append($form);
    this.destroyFastMenu();
    this.destroyOtherEditMessageForms($message);
    this.destroyOthersReply($message);
    this.destroyReply($message);
    $message.classList.add('channel-message_edit');
    this.bindFormHotKeys($message, $form);
  };

  destroyOtherEditMessageForms($message: HTMLLIElement): void {
    this.messagesMap.forEach((_, $item) => {
      if ($message !== $item) {
        this.destroyEditMessageForm($item);
      }
    });
  }

  displayDeleteConfirmDialog($container: HTMLElement, event: MouseEvent): void {
    const __ = translation();
    if (!isClosestElementOfCssClass(event.target, 'channel-message')) {
      return;
    }
    const $message = event.target.closest<HTMLLIElement>('.channel-message');
    if (!$message) {
      return;
    }
    const items = this.messagesMap.get($message);
    if (!items) {
      return;
    }
    const $deleteContainer = $('div', 'chat__delete-container');
    const $deleteContent = $('div', 'chat__delete-content');
    const $deleteTitle = $('div', 'chat__delete-title');
    const $deleteQuestion = $('div', 'chat__delete-question');
    const $info = $('div', ['chat__delete-info', 'channel-message__info']);
    const $userName = $('span', 'channel-message__name');
    const $messageDate = $('span', 'channel-message__date');
    const $messageItem = $('p', ['chat__delete-message-item', 'channel-message__message']);

    $deleteTitle.textContent = __.deleteMessageDialog.heading;
    $deleteQuestion.textContent = __.deleteMessageDialog.question;
    $userName.textContent = `${items.message.username}`;
    $messageDate.textContent = `${items.message.date}`;
    $messageItem.textContent = items.message.message;

    const $deleteButtons = $('div', 'chat__delete-buttons');
    const $cancelButton = $('button', 'chat__delete-btn-cancel');
    const $confirmButton = $('button', 'chat__delete-btn-delete');

    $cancelButton.textContent = capitalize(__.common.cancel);
    $confirmButton.textContent = capitalize(__.common.delete);

    $info.append($userName, $messageDate, $messageItem);
    $deleteContent.append($deleteTitle, $deleteQuestion, $info);
    $deleteButtons.append($cancelButton, $confirmButton);
    $deleteContainer.append($deleteContent, $deleteButtons);

    $container.append($deleteContainer);

    $cancelButton.onclick = () => {
      this.cancelDeleteConfirmDialog();
    };

    $confirmButton.onclick = () => {
      this.onDeleteMessageDialogSubmit(items.message.id, $message);
    };
  }

  displayReply(event: MouseEvent): void {
    if (!isClosestElementOfCssClass(event.target, 'channel-message')) {
      return;
    }
    const $message = event.target.closest<HTMLLIElement>('.channel-message');
    if (!$message) {
      return;
    }
    const items = this.messagesMap.get($message);
    if (!items) {
      return;
    }
    this.destroyOthersReply($message);
    this.destroyOtherEditMessageForms($message);
    this.destroyEditMessageForm($message);
    $message.classList.add('channel-message_reply');
    this.$repliedMessage = $message;
    this.displayInputReply($message, items.message.username);
    this.$chatInput.focus();

    window.removeEventListener('keyup', ServersMainContentView.onReplyEscapeKeyup);
    window.addEventListener(
      'keyup',
      (ServersMainContentView.onReplyEscapeKeyup = (event) => {
        const key = event.key.toLowerCase();
        if (key === 'escape') {
          this.destroyReply($message);
        }
      })
    );
  }

  displayInputReply($message: HTMLLIElement, username: string): void {
    this.$replyContainer.innerHTML = '';
    this.$replyContainer.append(this.createReplyNotification($message, username));
  }

  createReplyNotification($message: HTMLLIElement, username: string): HTMLDivElement {
    const __ = translation();
    const $notification = $('div', 'chat__reply-notification');
    const $notifMessageContainer = $('div', 'chat__reply-notification-message-container');
    const $notifMessageText = $('span', 'chat__reply-notification-message-text');
    const $notifMessageUser = $('span', 'chat__reply-notification-message-user');
    //$notifMessage.innerHTML = `Replying to <strong>${username}</strong>`;
    $notifMessageText.textContent = __.common.replyingTo;
    $notifMessageUser.textContent = username;
    const $destroyButton = $('button', 'chat__reply-notification-message-destroy');

    $notifMessageContainer.append($notifMessageText, $notifMessageUser);
    $notification.append($notifMessageContainer, $destroyButton);

    $destroyButton.onclick = () => {
      this.destroyReply($message);
    };
    return $notification;
  }

  createEditMessageForm($message: HTMLLIElement, message: RenderedChannelMessage): HTMLFormElement {
    const __ = translation();
    const $form = $('form', 'channel-message__edit-form');
    const $messageContainer = $('div', 'channel-message__edit-form-container');
    const $messageInput = $('input', 'channel-message__edit-form-input');
    const $messageIdInput = $('input');
    const $replyIdInput = $('input');
    const $controlsContainer = $('div', 'channel-message__edit-form-controls');
    const $cancelControl = $('button', 'channel-message__edit-form-cancel');
    const $saveControl = $('button', 'channel-message__edit-form-save');

    $messageInput.name = 'message';
    $messageInput.value = message.message;

    $messageIdInput.name = 'id';
    $messageIdInput.type = 'hidden';
    $messageIdInput.value = message.id;

    $replyIdInput.name = 'responsedToMessageId';
    $replyIdInput.type = 'hidden';
    $replyIdInput.value = this.getReplyId() || '';

    $saveControl.type = 'submit';
    $saveControl.textContent = __.common.save;

    $cancelControl.type = 'button';
    $cancelControl.textContent = __.common.cancel;

    $messageContainer.append($messageInput);
    $controlsContainer.append(`${__.common.escapeTo} `, $cancelControl, ` • ${__.common.enterTo} `, $saveControl);
    $form.append($messageContainer, $controlsContainer, $messageIdInput);

    $form.onsubmit = async (event) => {
      event.preventDefault();
      await this.onEditMessageFormSubmit(new FormData($form), $message);
      this.destroyEditMessageForm($message);
    };

    $cancelControl.onclick = () => {
      this.destroyEditMessageForm($message);
    };

    return $form;
  }

  editMessageContent($message: HTMLLIElement, message: RenderedChannelMessage): void {
    const items = this.messagesMap.get($message);
    if (!items) {
      return;
    }
    items.$messageContent.textContent = message.message;
    items.message = message;
  }

  deleteMessage($message: HTMLLIElement): void {
    $message.remove();
  }

  onRepliedInfoClick = (event: MouseEvent): void => {
    if (isClosestElementOfCssClass(event.target, 'channel-message__replied-info')) {
      const $info = event.target.closest<HTMLElement>('.channel-message__replied-info');
      if ($info) {
        const messageSelector = $info.dataset.scrollTo;
        const $message = document.querySelector<HTMLElement>(messageSelector || '');
        if ($message) {
          $message.scrollIntoView();
        }
      }
    }
  };

  onDisplayEditMessageForm = (event: MouseEvent): void => {
    if (isClosestElementOfCssClass<HTMLLIElement>(event.target, 'channel-message')) {
      const $message = event.target.closest<HTMLLIElement>('.channel-message');
      if ($message) {
        this.displayEditMessageForm($message);
      }
    }
  };

  onFastMenuEditButtonClick = (event: MouseEvent): void => {
    console.log('Not binded');
  };

  onFastMenuDeleteButtonClick = (event: MouseEvent): void => {};

  onFastMenuReplyButtonClick = (event: MouseEvent): void => {};

  onEditMessageFormSubmit = async (formData: FormData, $message: HTMLLIElement): Promise<void> => {};

  onDeleteMessageDialogSubmit = async (messageId: string, $message: HTMLLIElement): Promise<void> => {};

  onMessageHoverKey = (
    key: string,
    $message: HTMLLIElement,
    message: RenderedChannelMessage,
    isEdit: boolean,
    event: MouseEvent
  ): void => {};

  static onMessageHoverKeyup = (event: KeyboardEvent): void => {};

  static onReplyEscapeKeyup = (event: KeyboardEvent): void => {};

  cancelDeleteConfirmDialog = (): void => {};

  bindEditMessageFormSubmit = (handler: (formData: FormData, $message: HTMLLIElement) => Promise<void>): void => {
    this.onEditMessageFormSubmit = handler;
  };

  bindDeleteMessageDialogSubmit = (handler: (messageId: string, $message: HTMLLIElement) => Promise<void>): void => {
    this.onDeleteMessageDialogSubmit = handler;
  };

  bindFastMenuEditButtonClick = (handler: (event: MouseEvent) => void): void => {
    this.onFastMenuEditButtonClick = handler;
  };

  bindFastMenuDeleteButtonClick = (handler: (event: MouseEvent) => void): void => {
    this.onFastMenuDeleteButtonClick = handler;
  };

  bindCancelDeleteConfirmDialog = (handler: () => void): void => {
    this.cancelDeleteConfirmDialog = handler;
  };

  bindFastMenuReplyButtonClick = (handler: (event: MouseEvent) => void): void => {
    this.onFastMenuReplyButtonClick = handler;
  };

  bindOnMessageHoverKey = (
    handler: (
      key: string,
      $message: HTMLLIElement,
      message: RenderedChannelMessage,
      isEdit: boolean,
      event: MouseEvent
    ) => Promise<void>
  ) => {
    this.onMessageHoverKey = handler;
  };

  bindFormHotKeys = ($message: HTMLLIElement, $form: HTMLFormElement): void => {
    window.onkeyup = (event) => {
      if (event.key === 'Escape') {
        this.destroyEditMessageForm($message);
      } else if (event.key === 'Enter') {
        // $form.submit();
      }
    };
  };

  resetFormHotKeys = () => {
    window.onkeyup = null;
  };
}

export default ServersMainContentView;
