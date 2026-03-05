import { TestBed } from '@angular/core/testing';

import { Flat } from './flat';

describe('Flat', () => {
  let service: Flat;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Flat);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
