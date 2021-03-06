/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiColorPicker,
  EuiFieldText,
  EuiFilePicker,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  isValidHex,
} from '@elastic/eui';
import type { ChangeEvent } from 'react';
import React, { Component } from 'react';

import { i18n } from '@kbn/i18n';
import type { Space } from 'src/plugins/spaces_oss/common';

import { MAX_SPACE_INITIALS } from '../../../../common';
import { encode, imageTypes } from '../../../../common/lib/dataurl';
import { getSpaceColor, getSpaceInitials } from '../../../space_avatar';

interface Props {
  space: Partial<Space>;
  onChange: (space: Partial<Space>) => void;
}

interface State {
  initialsHasFocus: boolean;
  pendingInitials?: string | null;
}

export class CustomizeSpaceAvatar extends Component<Props, State> {
  private initialsRef: HTMLInputElement | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      initialsHasFocus: false,
    };
  }

  private storeImageChanges(imageUrl: string) {
    this.props.onChange({
      ...this.props.space,
      imageUrl,
    });
  }

  //
  // images below 64x64 pixels are left untouched
  // images above that threshold are resized
  //

  private handleImageUpload = (imgUrl: string) => {
    const thisInstance = this;
    const image = new Image();
    image.addEventListener(
      'load',
      function () {
        const MAX_IMAGE_SIZE = 64;
        const imgDimx = image.width;
        const imgDimy = image.height;
        if (imgDimx <= MAX_IMAGE_SIZE && imgDimy <= MAX_IMAGE_SIZE) {
          thisInstance.storeImageChanges(imgUrl);
        } else {
          const imageCanvas = document.createElement('canvas');
          const canvasContext = imageCanvas.getContext('2d');
          if (imgDimx >= imgDimy) {
            imageCanvas.width = MAX_IMAGE_SIZE;
            imageCanvas.height = Math.floor((imgDimy * MAX_IMAGE_SIZE) / imgDimx);
            if (canvasContext) {
              canvasContext.drawImage(image, 0, 0, imageCanvas.width, imageCanvas.height);
              const resizedImageUrl = imageCanvas.toDataURL();
              thisInstance.storeImageChanges(resizedImageUrl);
            }
          } else {
            imageCanvas.height = MAX_IMAGE_SIZE;
            imageCanvas.width = Math.floor((imgDimx * MAX_IMAGE_SIZE) / imgDimy);
            if (canvasContext) {
              canvasContext.drawImage(image, 0, 0, imageCanvas.width, imageCanvas.height);
              const resizedImageUrl = imageCanvas.toDataURL();
              thisInstance.storeImageChanges(resizedImageUrl);
            }
          }
        }
      },
      false
    );
    image.src = imgUrl;
  };

  private onFileUpload = (files: FileList | null) => {
    if (files == null) return;
    const file = files[0];
    if (imageTypes.indexOf(file.type) > -1) {
      encode(file).then((dataurl: string) => this.handleImageUpload(dataurl));
    }
  };

  public render() {
    const { space } = this.props;

    const { initialsHasFocus, pendingInitials } = this.state;

    const spaceColor = getSpaceColor(space);
    const isInvalidSpaceColor = !isValidHex(spaceColor) && spaceColor !== '';

    return (
      <form onSubmit={() => false}>
        <EuiFormRow
          label={i18n.translate(
            'xpack.spaces.management.customizeSpaceAvatar.initialItemsFormRowLabel',
            {
              defaultMessage: 'Initials (2 max)',
            }
          )}
        >
          <EuiFieldText
            inputRef={this.initialsInputRef}
            data-test-subj="spaceLetterInitial"
            name="spaceInitials"
            // allows input to be cleared or otherwise invalidated while user is editing the initials,
            // without defaulting to the derived initials provided by `getSpaceInitials`
            value={initialsHasFocus ? pendingInitials || '' : getSpaceInitials(space)}
            onChange={this.onInitialsChange}
            disabled={this.props.space.imageUrl && this.props.space.imageUrl !== '' ? true : false}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow
          label={i18n.translate('xpack.spaces.management.customizeSpaceAvatar.colorFormRowLabel', {
            defaultMessage: 'Color',
          })}
          isInvalid={isInvalidSpaceColor}
        >
          <EuiColorPicker
            color={spaceColor}
            onChange={this.onColorChange}
            isInvalid={isInvalidSpaceColor}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        {this.filePickerOrImage()}
      </form>
    );
  }

  private removeImageUrl() {
    this.props.onChange({
      ...this.props.space,
      imageUrl: '',
    });
  }

  public filePickerOrImage() {
    if (!this.props.space.imageUrl) {
      return (
        <EuiFormRow
          label={i18n.translate('xpack.spaces.management.customizeSpaceAvatar.imageUrl', {
            defaultMessage: 'Custom image',
          })}
        >
          <EuiFilePicker
            display="default"
            data-test-subj="uploadCustomImageFile"
            initialPromptText={i18n.translate(
              'xpack.spaces.management.customizeSpaceAvatar.selectImageUrl',
              {
                defaultMessage: 'Select image file',
              }
            )}
            onChange={this.onFileUpload}
            accept={imageTypes.join(',')}
          />
        </EuiFormRow>
      );
    } else {
      return (
        <EuiFlexItem grow={true}>
          <EuiButton onClick={() => this.removeImageUrl()} color="danger" iconType="trash">
            {i18n.translate('xpack.spaces.management.customizeSpaceAvatar.removeImage', {
              defaultMessage: 'Remove custom image',
            })}
          </EuiButton>
        </EuiFlexItem>
      );
    }
  }

  public initialsInputRef = (ref: HTMLInputElement) => {
    if (ref) {
      this.initialsRef = ref;
      this.initialsRef.addEventListener('focus', this.onInitialsFocus);
      this.initialsRef.addEventListener('blur', this.onInitialsBlur);
    } else {
      if (this.initialsRef) {
        this.initialsRef.removeEventListener('focus', this.onInitialsFocus);
        this.initialsRef.removeEventListener('blur', this.onInitialsBlur);
        this.initialsRef = null;
      }
    }
  };

  public onInitialsFocus = () => {
    this.setState({
      initialsHasFocus: true,
      pendingInitials: getSpaceInitials(this.props.space),
    });
  };

  public onInitialsBlur = () => {
    this.setState({
      initialsHasFocus: false,
      pendingInitials: null,
    });
  };

  public onInitialsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const initials = (e.target.value || '').substring(0, MAX_SPACE_INITIALS);

    this.setState({
      pendingInitials: initials,
    });

    this.props.onChange({
      ...this.props.space,
      initials,
    });
  };

  public onColorChange = (color: string) => {
    this.props.onChange({
      ...this.props.space,
      color,
    });
  };
}
